# Deoria City Guide

A bilingual (English / हिन्दी) guide to Deoria, Uttar Pradesh: places, history, people, officials, transport, a layered map, offline emergency helplines and a Claude-powered assistant that answers only from the guide's own data.

Built from the claude.ai/design project _Deoria City Guide_. The original HTML prototype is kept in `design/prototype.html` for reference.

## Stack

| Layer     | Choice                                                                     |
| --------- | -------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript |
| Styling   | Tailwind CSS v4 with the design's tokens in `src/app/globals.css`, Poppins |
| Content   | JSON files in `src/data`, validated with Zod at build time                 |
| Assistant | Claude (`claude-opus-5-5`) via `@anthropic-ai/sdk`, tool use over the JSON |
| Map       | Leaflet + OpenStreetMap                                                    |
| Offline   | Service worker (`public/sw.js`) caches the emergency pages                 |
| Tests     | Vitest                                                                     |

## Getting started

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to enable the assistant
npm run dev                  # http://localhost:3000
```

| Script           | What it does                                |
| ---------------- | ------------------------------------------- |
| `npm run dev`    | Development server                          |
| `npm run build`  | Production build (fails on invalid content) |
| `npm start`      | Serve the production build                  |
| `npm run check`  | Typecheck + lint + tests                    |
| `npm test`       | Unit and API-route tests                    |
| `npm run format` | Prettier                                    |

## Project layout

```
src/
  app/
    [locale]/              en + hi routes (home, explore/[slug], history, people,
                           governance, transport, map, emergency, culture, gallery,
                           about, search)
    api/chat/              Streaming assistant (NDJSON) with tool use
    api/search/            Full-text search
    api/corrections/       "Suggest a correction" form → email (Resend) or server log
    sitemap.ts robots.ts manifest.ts
  components/              Header, sections, map, chat widget, forms
  data/*.json              ← all city content lives here
  i18n/{en,hi}.json        UI strings
  lib/
    data.ts schema.ts      Load + validate content
    search.ts              Bilingual search with Hinglish spelling tolerance
    chat/                  System prompt, tools, request protocol
    rate-limit.ts          Per-IP limits for the APIs
  proxy.ts                 Redirects / to /en or /hi (Accept-Language, cookie)
public/sw.js               Offline emergency pages
tests/                     Vitest suites
```

## Editing content

All content is in `src/data/*.json`. Every text field has `en` and `hi` values.

- **Places** (`places.json`): `slug`, `categories` (`faith`, `health`, `transport`, `offices`, `education`), `name`, `area`, `summary`, plus optional `distance`, `tips`, `phone` and `coords`. Set `coordsApprox: true` unless the coordinates are surveyed. `verified` is the date it was last checked (`YYYY-MM-DD`) or `null`, and `sources` lists ids from `sources.json`. `aliases` holds extra spellings for search.
- **Officials** (`officials.json`): set `verified: false` until confirmed. The site shows a "Re-check" badge, and the assistant tells users the entry is unconfirmed.
- **Emergency numbers** (`emergency.json`): exactly one entry must have `featured: true`.

`npm run build` and `npm test` validate every file. Invalid content fails with a message naming the file and field.

**Photos** (`photos.json`): each entry has an image under `public/images/photos/`, a bilingual caption, the author, the licence, and a link to its source. Places use one through `photoId`. The home hero (`heroPhoto`) and the gallery are set in `city.json`. Current photos come from Wikimedia Commons under CC BY / BY-SA / CC0. Their credits show on each image and on the About page, so keep the author and licence fields accurate when you add photos.

> **Permission pending:** photos marked `permissionPending: true` in `photos.json` come from sources that require the owner's permission: the District Administration (deoria.nic.in) and YouTube creators. Each entry's `sourceUrl` shows whom to ask. Get permission before the site goes public, then remove the flag; the build logs a warning listing any still pending.

## The assistant

`POST /api/chat` streams newline-delimited JSON events (`text`, `status`, `break`, `done`, `error`).

- **Model and request:** Claude Opus 5.5 at `effort: "low"`. The system prompt is cached, and the request enables server-side refusal fallback (`fallbacks: "default"`).
- **Tools:** Claude answers only through four tools that read the JSON data: `search_guide`, `get_topic`, `get_places` and `get_place`. Unverified entries are flagged to the model.
- **Language:** it replies in the user's language: English, Hindi or Hinglish.
- **Stateless server:** the browser keeps the conversation (text only) in `sessionStorage`. Each request's tool loop is append-only.
- **Limits:**
  - 6 requests a minute and 40 an hour per IP.
  - At most 20 messages per conversation.
  - At most 2,000 characters per message.
- **Missing key:** without `ANTHROPIC_API_KEY`, the endpoint returns 503 and the widget shows a friendly message.

## Deployment (Vercel)

1. Import the repository in Vercel.
2. Set these environment variables: `NEXT_PUBLIC_SITE_URL`, `ANTHROPIC_API_KEY`, and optionally `RESEND_API_KEY`, `CORRECTIONS_EMAIL_TO` and `CORRECTIONS_EMAIL_FROM`.
3. Deploy. Every page is prerendered; only the three API routes run on demand.

Rate limits are kept in memory per server instance. For strict global limits across serverless instances, back `src/lib/rate-limit.ts` with Redis (for example Upstash).
