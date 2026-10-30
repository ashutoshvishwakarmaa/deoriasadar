/**
 * Check every external link in the content files (src/data/*.json) and report broken ones.
 * Dependency-free: uses the global fetch in Node 20+.
 *
 *   npm run check:links     # exits 1 if any link is broken; 429s and repeated timeouts are only warnings
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const USER_AGENT = "DeoriaGuide-LinkCheck/1.0 (+repo url unknown)";
const TIMEOUT_MS = 15_000;
const RETRIES = 1;
const CONCURRENCY = 4;
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;

/**
 * Collect unique external URLs from parsed content files, with the places each one is used.
 * `files` maps a file name to its parsed JSON; returns `[{ url, refs: ["sources.json[0].url", …] }]` in first-seen order.
 */
export function collectUrls(files) {
  const found = new Map();
  const add = (url, ref) => {
    // Drop sentence punctuation after a URL in prose, and a closing bracket that wraps it, e.g. "(see https://…)".
    let clean = url.replace(/[.,;:!?]+$/, "");
    while (clean.endsWith(")") && clean.split("(").length < clean.split(")").length) clean = clean.slice(0, -1);
    if (!found.has(clean)) found.set(clean, []);
    if (!found.get(clean).includes(ref)) found.get(clean).push(ref);
  };
  const walk = (value, at) => {
    if (typeof value === "string") {
      for (const match of value.match(URL_PATTERN) ?? []) add(match, at);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${at}[${i}]`));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, `${at}.${k}`);
    }
  };
  for (const [name, json] of Object.entries(files)) walk(json, name);
  return [...found].map(([url, refs]) => ({ url, refs }));
}

/** Read and parse every JSON file in a directory, keyed by file name. */
export function readDataFiles(dir) {
  /** @type {Record<string, unknown>} */
  const files = {};
  for (const name of readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    files[name] = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
  }
  return files;
}

async function request(url, method) {
  // `redirect: "follow"` is the default; res.url is the final location after redirects.
  const res = await fetch(url, {
    method,
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Don't download bodies we don't need.
  await res.body?.cancel().catch(() => {});
  return res;
}

/** One attempt: HEAD first, GET when the server rejects HEAD. */
async function probe(url) {
  let res = await request(url, "HEAD");
  if ([403, 405, 501].includes(res.status)) res = await request(url, "GET");
  return { status: res.status, finalUrl: res.url };
}

/** Check a link with retries. Status: "ok", "warning" (429 or timeout — often transient) or "broken". */
export async function checkUrl(url) {
  let last;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const { status, finalUrl } = await probe(url);
      const redirected = finalUrl && finalUrl !== url ? finalUrl : undefined;
      if (status < 400) return { url, status: "ok", code: status, redirected };
      last = { url, status: status === 429 ? "warning" : "broken", code: status, redirected };
      // Retry only what might succeed on a second try.
      if (status !== 429 && status < 500) return last;
    } catch (error) {
      const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
      const cause = error?.cause?.code ?? error?.cause?.message ?? error?.message;
      last = { url, status: timedOut ? "warning" : "broken", code: timedOut ? "timeout" : cause };
    }
  }
  return last;
}

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const dataDir = fileURLToPath(new URL("../src/data/", import.meta.url));
  const links = collectUrls(readDataFiles(dataDir));
  console.log(`Checking ${links.length} unique links from src/data/*.json …\n`);

  const results = await mapLimit(links, CONCURRENCY, (l) => checkUrl(l.url));
  const label = { ok: "OK  ", warning: "WARN", broken: "FAIL" };
  for (const [i, r] of results.entries()) {
    console.log(`${label[r.status]}  ${String(r.code).padEnd(12)}  ${r.url}`);
    if (r.redirected) console.log(`${" ".repeat(20)}→ ${r.redirected}`);
    if (r.status !== "ok") console.log(`${" ".repeat(20)}used in ${links[i].refs.join(", ")}`);
  }

  const count = (s) => results.filter((r) => r.status === s).length;
  console.log(`\n${count("ok")} ok, ${count("warning")} warnings, ${count("broken")} broken (of ${results.length}).`);
  if (count("broken") > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
