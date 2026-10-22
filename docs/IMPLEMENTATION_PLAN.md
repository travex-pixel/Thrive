# LodgeReady — implementation plan

## One customer, one problem, one action, one result
- **Customer:** a couple lodging an Australian partner visa themselves.
- **Problem:** hundreds of messy files and strict ImmiAccount limits (5 MB per file, a limited number of attachments,
  only certain file types, no deleting after you submit).
- **Primary action:** add files → sort into categories → build.
- **Result:** numbered, date-ordered PDFs (each under 5 MB) with cover pages and an evidence index, ready to upload.

## Smallest feature set (MVP)
1. **Add files**: drag and drop or tap to pick. Accepts PDF, JPG, PNG, GIF, BMP, WEBP and HEIC/HEIF. Office/text files ImmiAccount
   accepts (doc, docx, xls, xlsx, rtf, txt, ppt, pptx) pass through untouched as their own uploads.
2. **Sort**: Financial, Household, Social, Commitment (merged into one PDF per category), plus Identity and
   Forms & statements (kept as separate uploads) and Other. Editable title and date per file; bulk move.
3. **Build**: date-ordered PDFs, each starting with a cover page. Captions on photo pages, an evidence index, auto-split
   under 5 MB, encrypted PDFs rasterised into clean copies, and an attachment count against the limit (60 by default; can be changed).
4. **Download**: individual files plus a ZIP of everything.
5. **Free single-file fixer**: any one file becomes a PDF or JPG under 5 MB, in an accepted format.
6. **Monetisation**: building and previewing are free; packs of up to 10 files can be downloaded free. Larger packs need a
   one-off A$29 unlock (Stripe Checkout), and there is a "restore purchase" option.
7. **Persistence**: the workspace (files and labels) is saved in this browser's IndexedDB, so a refresh or the payment
   redirect loses nothing. A "Clear everything" control is included.

Out of scope for the MVP: accounts, cloud sync, AI, WhatsApp parsing, timeline builder, collaboration.

## Architecture
- **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4**, all open source.
- **Everything runs client-side** (pdf-lib, pdf.js, fflate, heic2any, exifr, idb-keyval, all MIT/Apache).
  Our servers never receive a single document.
- **The only backend** is three Next.js route handlers for payments: `POST /api/checkout`, `GET /api/verify` and
  `POST /api/restore`. They talk to Stripe with a server-side secret key and issue an HMAC-signed unlock token.
  No database.
- **Strict Content-Security-Policy:** the page can only connect to its own origin (plus an analytics endpoint, if
  configured). That backs up the "nothing is uploaded" promise with something checkable.
- **Analytics (optional, privacy-preserving):** a few anonymous funnel events with no file names or contents,
  sent to PostHog only if a key is configured.
- **Hosting:** Netlify free plan, which allows commercial use. Hosting is A$0/month.

## Apple Human Interface Guidelines applied
- Every control has a touch target of at least 44×44 pt.
- System font stack (SF Pro on Apple devices) with a 17 px body, sized in rem so it follows the user's text-size setting.
- Semantic colour tokens with automatic dark mode, and at least 4.5:1 contrast.
- Native controls (select, date input) so iOS shows its own pickers.
- On mobile, the primary action sits in a bottom bar within thumb reach, padded for the safe area.
- Clear feedback: live progress, toasts, and inline errors next to the item.
- Motion respects `prefers-reduced-motion`. Every step works with the keyboard alone, with visible focus rings.
- Details appear only when needed: summary rows, with a sheet for editing.

## Quality gates
- Unit tests (Vitest) for the planning, naming, date parsing and licence-token code.
- End-to-end tests (Playwright, Chromium) for the core journey with real generated PDFs and images. The tests check
  that every output is under 5 MB, the ZIP, the paywall, the fixer, and the mocked checkout API.
- Typecheck, lint, production build.
- Screenshots at 390×844 (iPhone) and 1440×900 (desktop) for the UX review.
