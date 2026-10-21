# LodgeReady

**Partner visa evidence, ready for ImmiAccount.** LodgeReady turns hundreds of photos, statements and screenshots into
numbered, date-ordered PDFs. Every file is under ImmiAccount's 5 MB limit, each has a contents page, and there's an
evidence index. Everything runs **in the browser**: documents are never uploaded.

- Free: the single-file fixer (`/fix`) and packs of up to 10 files.
- A$29 one-off: unlimited packs and rebuilds (Stripe Checkout), with a 30-day money-back guarantee.

Why this product, and the evidence behind it: [`docs/research/REPORT.md`](docs/research/REPORT.md).
How to launch and sell it: [`docs/launch/`](docs/launch/).

## Quick start
```bash
npm install          # also copies pdf.js runtime assets into public/vendor (postinstall)
npm run dev          # http://localhost:3000
```
Payments are optional locally. Without `STRIPE_SECRET_KEY` the unlock button explains that payments aren't switched on yet.

| Command | What it does |
|---|---|
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint (Next.js config) |
| `npm test` | Unit tests (Vitest): dates, planning, naming, suggestions |
| `npm run test:e2e` | End-to-end tests (Playwright, Chromium) using real PDFs, HEIC, locked and oversized files |

## How it works
```
Files ─▶ inspect (pages, locks, EXIF/file-name dates, group suggestion) ─▶ IndexedDB (this browser only)
      ─▶ plan (groups → numbered files, attachment count)
      ─▶ build: re-encode photos (HEIC/WEBP → JPEG), copy text PDFs (text stays selectable),
                re-render locked/scan-heavy PDFs, add captions + contents pages,
                save each file, MEASURE it, split/shrink until ≤ 5,000,000 bytes
      ─▶ index PDF + ZIP
```
- `src/lib/pack/`: the engine (pure planning logic is unit-tested; browser work uses pdf-lib, pdf.js, heic2any, fflate).
- `src/components/builder/`: the three-step builder UI (Add → Sort → Build).
- `src/app/api/checkout` and `src/app/api/verify`: the **only** server code. They create a Stripe Checkout Session and
  confirm payment, then issue an HMAC-signed unlock token. There's no database.
- `next.config.ts`: security headers. The Content-Security-Policy limits network connections to the site's own origin
  (plus analytics, if configured), which is what enforces "nothing is uploaded".

## Design
Built to Apple's Human Interface Guidelines:
- 44×44 pt minimum touch targets (checked by an automated test).
- The system font with a 17 px body, sized in rem so it follows the user's text-size setting.
- Semantic colour tokens with dark mode, all text at WCAG AA contrast (≥ 4.5:1).
- Native pickers and bottom sheets, and the primary action in a bottom bar within thumb reach.
- Respects reduced-motion settings.
- Accessibility is checked with axe-core on every screen.

## Configuration
See [`docs/launch/DEPLOY.md`](docs/launch/DEPLOY.md) for every environment variable. Secrets
(`STRIPE_SECRET_KEY`, `LICENSE_SIGNING_SECRET`) are server-only and are never shipped to the browser.

## Open-source components
Next.js, React, Tailwind CSS (MIT); pdf-lib, @pdf-lib/fontkit, fflate, exifr, heic2any (MIT; heic2any bundles libheif,
LGPL-3.0); pdf.js (Apache-2.0); idb-keyval (Apache-2.0); lucide-react (ISC); Noto Sans (SIL OFL 1.1); Stripe Node SDK (MIT);
Playwright (Apache-2.0); Vitest (MIT); axe-core (MPL-2.0).

## Not legal advice
LodgeReady is a document tool. It does not provide immigration advice or assistance, and it isn't affiliated with the
Department of Home Affairs.
