# ReceiptIQ

Scan a receipt, get instant verdicts on **overpriced items** and **hidden subscription / fee traps**. Every line item comes back stamped `Fair`, `Overpriced` or `Trap`.

ReceiptIQ is a **portfolio / demo project**. The matching and flagging logic is real and tested, but the price data is a curated, illustrative dataset — not live-verified prices. Don't use it to make real purchasing decisions.

One Next.js codebase serves two surfaces:

- an installable, mobile-first **PWA** (camera capture, offline-capable), and
- a server-rendered **marketing site** on desktop (`/`, `/about`) that's real HTML on first paint and indexable.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The app runs fully with **no environment variables set**:

- no `GEMINI_API_KEY` → the AI OCR route returns `501` and the scanner falls back to on-device Tesseract.js automatically.
- no database → the price API reads the bundled `data/price-db.json` directly.

Copy `.env.example` to `.env.local` to opt into the AI OCR path.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack). |
| `npm run build` / `npm start` | Production build / serve. |
| `npm test` | Unit tests for the matching + parsing logic (Vitest). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint (flat config). |
| `npm run build:assets` | Rasterize `public/icon.svg` + `scripts/og-template.svg` into the PNG/ICO/WebP assets. |
| `npm run build:coredb` | Reseed `data/price-db-core.json` (offline subset) from the full catalog. |

---

## Architecture notes

### Rendering split — deliberate, don't "fix" it

- **`/` and `/about` are server-rendered (SSG).** This is where SEO matters: real content in the initial HTML, `<title>` / description / OpenGraph via the Metadata API, semantic headings, fast LCP. The homepage even renders a real analyzed sample receipt server-side.
- **`/scan` is client-only (`"use client"`).** Camera access, the Tesseract.js WASM core and canvas work can't be meaningfully server-rendered and carry zero SEO value. The route file is a thin server wrapper around `<ScannerApp />`. SSR here would add complexity for no benefit — please don't add it.

### Hybrid OCR — AI first, automatic Tesseract fallback

Real photos go through `lib/ocr-ai.ts` → `app/api/ocr/route.ts`, which calls a free-tier vision model (Google Gemini by default) with the API key held **server-side only**. The model returns structured `{ name, price, qty }` line items directly, skipping regex parsing.

The client falls back to `lib/ocr-tesseract.ts` (local, in-browser) automatically on **any** of:

- HTTP error (`429` rate-limit, `5xx`, quota exceeded),
- network failure / timeout (~9 s client, ~12 s server),
- missing / unconfigured API key (route returns `501`).

On the fallback path the image never leaves the browser. The results view always shows an **engine badge** (`Scanned with AI ✨` vs `Scanned locally (Tesseract)`) and, when a fallback happened, a calm one-line notice — it's a normal mode of operation, not an error. Loading states for the two engines are distinct (`Analyzing with AI…` vs `Loading / Running on-device OCR…`, the latter with a progress bar since the first Tesseract run downloads ~5 MB). The **sample-picker flow never touches OCR**, so it's always reliable regardless of API state.

Get a free Gemini key at <https://aistudio.google.com/apikey> and set `GEMINI_API_KEY`.

### Verdict logic — two independent checks per item

Pure, framework-agnostic, unit-tested functions in `lib/matching.ts`:

1. **Price check** — fuzzy-match the item name against the dataset (token-overlap Dice coefficient + Levenshtein ratio, plus a shorthand-containment boost; threshold `0.6`). On a match, compare the unit price to the item's typical range → `Fair` / `Overpriced` (with a 10 % cushion). No match → `Unknown` (never guessed).
2. **Trap check** — scan the raw line text for subscription / fee keywords (`membership`, `auto-renew`, `free trial`, `convenience fee`, `protection plan`, `service charge`, …), independent of price. A hit → `Fee / Sub trap`.

An item can carry both stamps. `lib/parse-receipt.ts` handles the regex line-item extraction for the Tesseract path (trailing price, quantity markers like `X4`, thousands separators, skipping totals/tax/payment rows).

### Price data — JSON vs database

The curated catalog is **~350 entries across 22 categories**, stored as a checked-in JSON file (`data/price-db.json`) and served from `app/api/prices` so it stays out of the client bundle. At this size JSON is the right call — no infra, keeps the zero-cost story intact.

**When to move to a database** (roughly past ~1,500–2,000 entries): a large JSON file bloats the bundle and can't change without a redeploy. The migration path:

- Add **Vercel Postgres (Neon)** via the Vercel Storage tab (one click, injects `DATABASE_URL`), or a **Turso** database (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`).
- Add a Drizzle schema + a seed script that loads from the checked-in JSON, so the curated data stays version-controlled.
- Switch `app/api/prices/route.ts` to query the DB, keeping `data/price-db-core.json` bundled as the offline / no-DB fallback (the client already falls back to it when the route fails — see `lib/prices-client.ts`).

Prices are **illustrative ranges**, not verified live figures — see the `_readme` field in `data/price-db.json`.

### PWA

- `app/manifest.ts` → `/manifest.webmanifest`.
- `public/sw.js` — hand-rolled service worker: precache the shell, network-first for navigations with an `/offline` fallback, stale-while-revalidate for static assets, never cache `/api/ocr`. Registered by `components/ServiceWorker.tsx` (production only).
- Icons from `public/icon.svg` (square stamp-badge mark, **not** the wordmark) via `npm run build:assets`.
- **Installability ("Add to Home Screen") and the service worker only activate on a real HTTPS deployment** — not on `localhost` or a sandboxed preview.

### Branding

Dot-stamp wordmark in `public/logo/receiptiq-wordmark.svg` (used in the nav at every breakpoint). Palette — Paper cream `#FBF7EE`, Ink navy `#1B2A41`, Stamp red `#B8382B`, Stamp green `#2E7D32`, Muted grey-brown `#8B7E74` — lives as CSS variables in `app/globals.css`; the square PWA icon and OG image reuse the same tokens.

---

## Deploy to Vercel

1. Push to GitHub, import the repo in Vercel. Next.js is auto-detected — no build config needed.
2. (Optional) add `GEMINI_API_KEY` under **Settings → Environment Variables** to enable the AI OCR path. Everything works without it.
3. (Optional, only if the catalog outgrows JSON) provision Postgres/Turso via **Storage**, add the schema + seed, run the seed once.
4. After deploy, verify the OpenGraph preview with a link-preview debugger (Meta Sharing Debugger / LinkedIn Post Inspector) — social platforms cache OG data, so re-scrape after any change. A PNG fallback (`public/og/receiptiq-og-image.png`) is committed alongside the WebP if a specific crawler needs it.
5. Sanity checks: view-source on `/` shows real content (not an empty shell); Lighthouse SEO is clean; test both fallbacks locally by unsetting `GEMINI_API_KEY`.

---

## Project layout

```
app/            routes: / (SSG landing), /about (SSG), /scan (client wrapper),
                /offline, api/ocr, api/prices, manifest.ts, globals.css
components/      NavBar, Footer, ScannerApp (client), EngineBadge, ReceiptView,
                VerdictStamp, ScanInfo, ServiceWorker
lib/            matching.ts, parse-receipt.ts (pure, tested) · ocr-ai.ts,
                ocr-tesseract.ts · price-data.ts (server), prices-client.ts,
                flatten-price-db.ts, format.ts, types.ts
data/           price-db.json (source of truth) · price-db-core.json (offline
                subset) · sample-receipts.json (planted anomalies)
scripts/        generate-assets.mjs, build-core-db.mjs, og-template.svg
public/         icon.svg, sw.js, logo/, icons/, og/, apple-icon.png
```

## Not in scope (v1)

Live pricing APIs; an exhaustive "every product" dataset; listing-URL scraping; India-specific MRP/GST checks.
