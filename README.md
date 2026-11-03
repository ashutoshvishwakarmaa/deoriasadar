# Deoria City Guide

A bilingual (English / हिन्दी) guide to Deoria, Uttar Pradesh: places, history, people, officials (with sourced profile popups), transport, a layered map, offline emergency helplines and a Claude-powered assistant that answers only from the guide's own data. An "About me" page introduces the person who builds it.

## Stack

| Layer      | Choice                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript                    |
| Styling    | Tailwind CSS v4 with design tokens in `src/app/globals.css`, Poppins                          |
| Content    | JSON files in `src/data`, validated with Zod at build time                                    |
| Assistant  | Claude (`claude-opus-5-5`) via `@anthropic-ai/sdk`, tool use over the JSON                    |
| Map        | Leaflet + OpenStreetMap                                                                       |
| Offline    | Service worker (`public/sw.js`): emergency, explore, map and search pages, plus pages visited |
| Search     | Prebuilt bilingual index searched in the browser (works offline)                              |
| Sharing    | Generated Open Graph cards (`sharp`, so Hindi renders correctly), JSON-LD                     |
| Monitoring | Vercel Analytics and Sentry, both off until configured                                        |
| Tests      | Vitest (unit, API routes), Playwright + axe (browser, accessibility)                          |

## Getting started

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to enable the assistant
npm run dev                  # http://localhost:3000
```

| Script                | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `npm run dev`         | Development server                                                  |
| `npm run build`       | Production build (fails on invalid content)                         |
| `npm start`           | Serve the production build                                          |
| `npm run check`       | Typecheck + lint + tests                                            |
| `npm test`            | Unit and API-route tests                                            |
| `npm run test:e2e`    | Browser tests; run `npm run build` first                            |
| `npm run check:links` | Check every external link in `src/data`                             |
| `npm run feedback`    | Summary of assistant ratings and unanswered questions (needs Redis) |
| `npm run format`      | Prettier                                                            |

## Testing

**Development vs production.** `npm run dev` is for editing code and content. Some features only behave for real in a production build (`npm run build && npm start`):

- **Production only:** the service worker, and with it everything offline: saved pages, the offline banner, the "Saved for offline use" badge and cached map tiles.
- **Prerendering:** in development each page is compiled on its first visit, so the first request to a page is slow (`generate-params` in the log). Production prerenders every page at build time.
- **Share cards** (`/…/opengraph-image/card`) render on their first request and are cached after that.

**Start clean.** The service worker keeps copies of pages, scripts, photos and map tiles in the browser. After a new build, clear them so you see the new version: DevTools → Application → Storage → **Clear site data**, then reload with Ctrl+Shift+R. Or use a private window. To clear the build cache itself, stop the server and delete `.next`.

**Testing offline by hand.** In a production build, open a few pages, then DevTools → Network → **Offline**. The emergency, explore, map and search pages (both languages) and every page you opened still work. A page you never opened shows the emergency numbers instead.

**Automated tests.**

- `npm test`: unit and API-route tests (Vitest). No server or keys needed.
- `npm run build && npm run test:e2e`: browser tests (Playwright, desktop and phone size) against the production build on port 3100. They cover language routing, search, offline mode, the assistant (with a mocked API, so no key or cost), share cards, structured data, and axe accessibility checks (WCAG 2.1 AA). Run `npx playwright install chromium` once first. A failed run leaves a report in `playwright-report/`.
- `npm run check:links`: checks every external link in the content. A few sites refuse automated checks (Indian government and railway sites block requests from outside India, and LinkedIn answers bots with status 999); the list is in `scripts/check-links.mjs`, and a failure on those counts as a warning, not a broken link.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, formatting, unit tests, the build and the browser tests on every push to `main` and every pull request. The link check (`.github/workflows/links.yml`) runs on every push to `main`.

## Project layout

```
src/
  app/
    [locale]/              en + hi routes (home, explore/[slug], history, people,
                           governance, transport, map, emergency, culture, gallery,
                           about, about/creator, search), error/loading/404 pages,
                           share cards
    api/chat/              Streaming assistant (NDJSON) with tool use
    api/feedback/          👍 / 👎 on assistant answers
    api/corrections/       "Suggest a correction" form → Redis + email (Resend), Turnstile
    sitemap.ts robots.ts manifest.ts
  components/              Header, sections, official profile popup, map, chat widget,
                           forms, anchor-scroll (keeps #section links on target)
  data/*.json              ← all city content lives here
  i18n/{en,hi}.json        UI strings
  lib/
    data.ts schema.ts      Load + validate content
    search-engine.ts       Bilingual search with Hinglish spelling tolerance (runs in the browser)
    search.ts              Builds the search index from the content
    structured-data.ts     schema.org JSON-LD
    og.ts                  Share-card images
    feedback.ts            Anonymised assistant feedback and content gaps
    chat/                  System prompt, tools, request protocol
    rate-limit.ts redis.ts Per-IP limits for the APIs (Upstash Redis, memory fallback)
  proxy.ts                 Redirects / to /en or /hi (Accept-Language, cookie)
  instrumentation*.ts      Sentry (server and browser), only when a DSN is set
public/sw.js               Offline support
assets/fonts/              Poppins TTFs for share cards (OFL)
scripts/                   Link checker, feedback report
tests/                     Vitest suites
e2e/                       Playwright suites
.github/                   CI, link check, correction issue form, PR checklist
```

## Editing content

All content is in `src/data/*.json`. Every text field has `en` and `hi` values.

**Editors who are not developers** can edit these files directly on github.com, or report a mistake with the correction issue form (linked as "Suggest an edit" from every place page).

- **Places** (`places.json`): `slug`, `categories` (`faith`, `health`, `transport`, `offices`, `education`), `name`, `area`, `summary`, plus optional `distance`, `tips`, `phone` and `coords`. Set `coordsApprox: true` unless the coordinates are surveyed. `verified` is the date it was last checked (`YYYY-MM-DD`) or `null`, and `sources` lists ids from `sources.json`. `aliases` holds extra spellings for search.
- **Officials** (`officials.json`): set `verified: false` until confirmed. The site shows a "Re-check" badge, and the assistant tells users the entry is unconfirmed. The optional `profile` adds the popup behind "View details": `facts` (each with `en`, `hi` and a `source` URL) and `links` (`label` + `url`) to public profiles. Leave out anything sources disagree on. The assistant can also answer from these facts.
- **Transport** (`transport.json`): the optional `details` and `links` show only on the Getting around page. A detail with a `source` shows a [source] link; one without is shown as a "local tip" from the site owner.
- **About me** (`creator.json`): the creator page: photo, role, bio paragraphs, the Deoria connection, experience (with each company's website) and contact details.
- **Emergency numbers** (`emergency.json`): exactly one entry must have `featured: true`.

`npm run build` and `npm test` validate every file. Invalid content fails with a message naming the file and field.

**Photos** (`photos.json`): each entry has an image under `public/images/photos/`, a bilingual caption, the author, the licence, and a link to its source. Places use one through `photoId`. The home hero (`heroPhoto`) and the gallery are set in `city.json`. Photos come from Wikimedia Commons (CC BY / BY-SA / CC0), the district website, or the site owner ("Provided by site owner"). Their credits show on each image and on the About page, so keep the author and licence fields accurate when you add photos. For a logo or emblem, set `"fit": "contain"` so it shows whole, centred, instead of being cropped.

## The assistant

`POST /api/chat` streams newline-delimited JSON events (`text`, `status`, `break`, `done`, `error`).

- **Model and request:** Claude Opus 5.5 by default (set `CHAT_MODEL=claude-sonnet-5-5` for the cheaper Sonnet 5.5) at `effort: "low"`. The system prompt is cached, and the request enables server-side refusal fallback (`fallbacks: "default"`).
- **Tools:** Claude answers only through four tools that read the JSON data: `search_guide`, `get_topic`, `get_places` and `get_place`. Unverified entries are flagged to the model.
- **Language:** it replies in the user's language: English, Hindi or Hinglish.
- **Stateless server:** the browser keeps the conversation (text only) in `sessionStorage`. Each request's tool loop is append-only.
- **Limits:**
  - 6 requests a minute and 40 an hour per IP.
  - At most 20 messages per conversation.
  - At most 2,000 characters per message.
  - At most `CHAT_DAILY_LIMIT` requests (default 1,000) per UTC day across all visitors. After that the assistant reports itself unavailable until midnight UTC. This caps the daily bill; also set a monthly spend limit in the Claude Console as a hard backstop.
- **Kill switch:** `CHAT_DISABLED=1` turns the assistant off from the next deploy. With Redis, `SET chat:disabled 1` turns it off at once, and `DEL chat:disabled` turns it back on.
- **Missing key:** without `ANTHROPIC_API_KEY`, the endpoint returns 503 and the widget shows a friendly message.
- **Feedback:** each answer has 👍 / 👎 (`POST /api/feedback`). Searches that found nothing in the guide are recorded as content gaps. Both are stored anonymised in the Redis lists `feedback` and `gaps`: no IP, no conversation id, the day only, and phone numbers and emails removed. `npm run feedback` prints the most common gaps and recent 👎 answers.

## Deployment (Vercel)

1. Import the repository in Vercel.
2. Add Upstash Redis from the Vercel Marketplace (it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`).
3. Set the environment variables below.
4. Deploy. Every page is prerendered; only the API routes and share cards run on demand.

| Variable                                                           | Needed            | What it does                                                                  |
| ------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                             | Yes               | Public URL, for canonical links, the sitemap, share cards and structured data |
| `ANTHROPIC_API_KEY`                                                | For the assistant | Without it the assistant shows "unavailable"                                  |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) | Recommended       | Shared rate limits and daily cap; stores corrections and feedback             |
| `CHAT_MODEL`                                                       | No                | `claude-opus-5-5` (default) or `claude-sonnet-5-5`                            |
| `CHAT_DAILY_LIMIT`                                                 | No                | Assistant requests per UTC day across all visitors (default 1000)             |
| `CHAT_DISABLED`                                                    | No                | `1` turns the assistant off                                                   |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`           | No                | Cloudflare Turnstile on the corrections form (set both)                       |
| `RESEND_API_KEY`, `CORRECTIONS_EMAIL_TO`, `CORRECTIONS_EMAIL_FROM` | No                | Email corrections to editors                                                  |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`                             | No                | Error reports from the server and the browser                                 |

Vercel Analytics turns on by itself on Vercel deployments (enable it in the project's Analytics tab); query strings are removed before sending.

With Redis, rate limits and the daily cap are shared by every instance. Without it, or if Redis is unreachable, each instance counts in memory, so limits are per instance.

Rate limits key on the visitor's IP. On Vercel that is the platform-set address, which clients cannot forge. Behind your own reverse proxy, the last `X-Forwarded-For` entry is used. Run the app behind exactly one proxy that appends that header.

**Corrections** are saved in the Redis list `corrections`, newest first (Upstash's data browser shows them), and emailed when Resend is set up. A submission succeeds if either one works. With neither, it is only written to the server log.

**Error monitoring** (Sentry) sends errors only: no request headers, cookies, query strings, bodies, user details or assistant prompts (`src/lib/sentry-options.ts`). Also turn on "Prevent storing of IP addresses" in the Sentry project. Without a DSN, no Sentry code reaches visitors.

**Content-Security-Policy** is set in `next.config.ts`. Pages are prerendered, so it allows inline scripts instead of using per-request nonces. If you add a third-party script, image host or iframe, add its origin there.
