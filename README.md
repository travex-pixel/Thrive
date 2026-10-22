# LodgeReady

**Partner visa evidence, ready for ImmiAccount.** LodgeReady turns hundreds of photos, statements and screenshots into
numbered, date-ordered PDFs. Every file is under ImmiAccount's 5 MB limit, each has a contents page, and there's an
evidence index. Everything runs **in the browser**: documents are never uploaded.

- Free: the single-file fixer (`/fix`), building and previewing any pack, and downloading packs made from up to 10 documents.
- A$29 one-off: unlimited packs and rebuilds (Stripe Checkout), with a full refund within 30 days for any reason.

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
| `npm test` | Unit tests (Vitest): dates, planning, naming, document types, ZIP writer |
| `npm run test:e2e` | End-to-end tests (Playwright, Chromium) using real PDFs, HEIC, locked and oversized files |

## How it works
```
Files ─▶ inspect (pages, locks, suggested dates, "looks like" document type) ─▶ IndexedDB (this browser only)
      ─▶ sort: the applicant chooses a group per type (LodgeReady never decides where evidence belongs)
      ─▶ plan (groups → numbered files, attachment count; asks for the applicant's own attachment limit)
      ─▶ build: re-read every PDF's pages and locks, re-encode photos (HEIC/WEBP → JPEG, long screenshots cut
                into pages), copy text PDFs (text stays selectable), re-render locked/scan-heavy PDFs,
                add captions + contents pages, save each file, MEASURE it, split/shrink until ≤ 5,000,000 bytes
      ─▶ index PDF + ZIP (assembled from Blobs, so a big pack isn't copied in memory)
```
- Suggested dates (from photo data and file names) only set the order. A date is printed on a PDF only after the
  applicant confirms it.
- One tab owns the saved workspace at a time (Web Locks), so two open tabs can't overwrite each other.
- Checkout opens in its own tab; the builder tab checks for the payment and unlocks itself, keeping the built pack.
- `src/lib/pack/`: the engine (pure planning logic is unit-tested; browser work uses pdf-lib, pdf.js, heic2any, fflate).
- `src/components/builder/`: the three-step builder UI (Add → Sort → Build).
- `src/app/api/checkout` and `src/app/api/verify`: the **only** server code. They create a Stripe Checkout Session and
  confirm payment, then issue an HMAC-signed unlock token. There's no database.
- `next.config.ts`: security headers. One Content-Security-Policy for every page limits network connections to the
  site's own origin (plus analytics, if configured). The code never uploads files; the policy is a second line of
  defence, not a guarantee against code the site itself serves.

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
