/**
 * The search engine itself, with no data imports, so it runs in the browser as well as on the
 * server. src/lib/search.ts builds the index from the guide's content; the search page ships one
 * language's index to the client, so search needs no network and works offline.
 */

export type ResultType = "place" | "person" | "official" | "emergency" | "transport" | "history";

/** One searchable entry, already in the visitor's language. Tokens cover both languages. */
export interface SearchDoc {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  href: string;
  titleTokens: string[];
  bodyTokens: string[];
}

export interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

/** Lowercase, strip Latin diacritics, split on anything that is not a letter, digit or Devanagari mark. */
export function tokenize(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter((t) => t.length > 0);
}

/**
 * Collapse common Hinglish spelling variants so that "dudheshwar", "dugdheswar"
 * and "Dugdheshwar" land close together. Only applied to Latin-script tokens.
 */
export function phonetic(token: string): string {
  if (!/^[a-z0-9]+$/.test(token)) return token;
  return token
    .replace(/(.)\1+/g, "$1")
    .replace(/ee|ii/g, "i")
    .replace(/oo|uu/g, "u")
    .replace(/aa/g, "a")
    .replace(/w/g, "v")
    .replace(/sh|ss/g, "s")
    .replace(/([bcdgjkpt])h/g, "$1")
    .replace(/ph/g, "f")
    .replace(/z/g, "j")
    .replace(/q/g, "k")
    .replace(/y$/g, "i")
    .replace(/a$/g, "");
}

export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function tokenScore(q: string, token: string): number {
  if (token === q) return 3;
  if (q.length >= 2 && token.startsWith(q)) return 2;
  const pq = phonetic(q);
  const pt = phonetic(token);
  if (pq === pt) return 2;
  if (pq.length >= 4 && pt.startsWith(pq)) return 1.5;
  if (pq.length >= 4) {
    const allowed = pq.length >= 7 ? 2 : 1;
    if (editDistance(pq, pt, allowed) <= allowed) return 1;
  }
  return 0;
}

export function searchDocs(index: SearchDoc[], query: string, limit = 20): SearchResult[] {
  const qTokens = tokenize(query).slice(0, 8);
  if (qTokens.length === 0 || query.trim().length < 2) return [];

  const scored: SearchResult[] = [];
  for (const doc of index) {
    let total = 0;
    let matched = 0;
    for (const q of qTokens) {
      let best = 0;
      for (const t of doc.titleTokens) best = Math.max(best, tokenScore(q, t) * 2);
      if (best < 6) for (const t of doc.bodyTokens) best = Math.max(best, tokenScore(q, t));
      if (best > 0) matched++;
      total += best;
    }
    // Every query word must match, except in longer queries where one miss is tolerated.
    const needed = qTokens.length >= 3 ? qTokens.length - 1 : qTokens.length;
    if (matched >= needed && total > 0) {
      scored.push({ id: doc.id, type: doc.type, title: doc.title, subtitle: doc.subtitle, href: doc.href, score: total });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
