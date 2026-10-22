# LodgeReady: partner reviews A–F

Six reviews, each run against the real code (not a description of it). Every finding is ranked, fixed or explicitly
accepted, and retested. "Retest" names the automated test that now covers it, or says how it was checked.

Status of the product during these reviews: built and tested locally; **not deployed, no payments account, no
customers, no revenue**. Nothing has been published or sent to anyone.

| Review | Role | How it was run |
|---|---|---|
| A | CEO | Independent reviewer (separate agent), read-only, after the B/D/E fixes |
| B | CTO / security | Independent reviewer (separate agent), read-only, with throwaway reproduction scripts |
| C | CPO | Independent reviewer (separate agent), read-only, after the B/D/E fixes |
| D | UX and conversion director | Done in this session from real screenshots (desktop and iPhone, light and dark) |
| E | Red team | Independent reviewer (separate agent), read-only, with probe scripts and web sources |
| F | Final investment committee | This session, after all fixes and a full retest |

---

## Review D: UX and conversion (first pass, on rendered screens)

| # | Sev. | Finding | Fix | Retest |
|---|---|---|---|---|
| D1 | Critical | Files added just before a reload were lost: a debounced save kept being postponed by background checks | Saves serialised and coalesced; startup flags any file whose data never saved | E2E `work survives a reload` |
| D2 | High | Build step: settings pushed the result and paywall below the fold on phones; the paywall came after the whole file list on desktop | Results-first layout, paywall straight after the result, settings collapsed to a one-line summary with an edit sheet | Screenshots; E2E paywall assertions |
| D3 | High | At 393 px, long file names widened the grid and pushed the fixed bottom bar off screen | `grid-cols-1` on text grids | E2E `has no horizontal scroll`, mobile journey |
| D4 | High | Thumbnails broke after navigating away and back (object URLs revoked when the route was hidden by Cache Components) | Revoke only on remove/clear | Confirmed by Review B (code) |
| D5 | Medium | Add step: the drop zone kept the file list below the fold once files were added | Compact drop bar after the first add | Screenshots |
| D6 | Medium | Segmented controls and header button 40 px; switch hit area 51×31 (HIG asks for 44 pt) | 44 pt minimum everywhere; iOS-sized switch inside a 44 pt button | E2E 44 pt target audit on every screen |
| D7 | Medium | Paywall mixed up "files you added" and "files to upload" | Separate wording for input files and output files | Screenshots (re-checked in round 2, see D9) |
| D8 | Medium | Removing many files had no confirmation (HIG: confirm destructive actions on several items) | Confirmation sheet | E2E `downloads follow the pack that was built` |
| D9 | Low | "5 MB" broke across lines | Non-breaking spaces | Screenshots |

Round 2 (after the B/E fixes, new screenshots): the new paywall copy reintroduced D7 ("This pack has 14 files" next to
"3 files" in the result), now "This pack uses 14 of your files"; files rejected when added (password, wrong type) were
missing from the result, now listed under "Not in the pack"; in dark mode the selected segment was the same colour as
the control, now a lighter iOS-style grey.

---

## Review B: CTO and security

| # | Sev. | Finding | Fix | Retest |
|---|---|---|---|---|
| B-C1 | Critical | Page counts and encryption came only from a background check that could be lost on reload: an unchecked 5-page PDF came out as 1 page, an unchecked locked PDF was passed through still encrypted | The builder reads every PDF's page count and lock from the file itself (with a trial copy), never from saved data. Unfinished checks restart on load; checks can't throw or hang (20 s timeout) | E2E core journey and large pack (all 64 statement pages accounted for); unit tests |
| B-H1 | High | HEIC conversion hung forever for visitors arriving from the home page: the eval-free landing-page CSP stays with the document on client-side navigation | One CSP for every page; HEIC decode has a timeout, honours Cancel and fails fast after a stuck decode | E2E `HEIC photos convert after arriving from the home page`; `one strict security policy on every page` |
| B-H2 | High | "Restore a purchase" didn't unlock (the hidden builder kept its old state) and could leave a modal open over the next page | Restore uses a full page load; the builder re-reads the unlock on focus and on storage events; sheets close their dialog on cleanup | E2E `restoring a purchase unlocks the builder` |
| B-M1 | Medium | Free tier bypass: build 40 files, delete 30, download the stale 40-file pack | Downloads judged on the pack that was built, and paused while it's out of date | E2E `downloads follow the pack that was built` |
| B-M2 | Medium | One bad PDF failed the whole pack without saying which file | Trial copy at preparation; a file that can't be rendered or shrunk is left out by name and the rest of its group is built | E2E unusable files; result lists "Not in the pack" |
| B-M3 | Medium | Peak memory about 3× the pack (measurement renders kept, ZIP built in memory, every thumbnail decoded at once) | Measurement renders discarded; single-file groups rendered once; finished files kept as Blobs; ZIP assembled from Blobs (one file read at a time for its checksum); two thumbnails at a time | Unit tests for the ZIP writer, also verified with `unzip -t` and Python `zipfile` |
| B-M4 | Medium | Two open tabs overwrote each other's work; "Clear everything" in one tab deleted the other's files | One tab owns the saved workspace (Web Locks) and the old tab hands over after its last save; orphaned file data is cleaned up | E2E `only one tab changes the saved files at a time` |
| B-M5 | Medium | pdf.js worker served from an unversioned, 7-day-cached path: after an upgrade, returning users would pair old and new code | Versioned asset folder, cached as immutable; the copy script now fails the build if assets are missing | Build output |
| B-M6 | Medium | Checkout only worked from the one address baked in at build time (custom domain, www, previews got a bare 403) | Allowed addresses read at request time (`SITE_URL`, `ALLOWED_ORIGINS`); Stripe returns buyers to the page they paid from; the 403 explains itself and is counted | E2E API tests |
| B-L | Low | 100%-off codes would fail verification; slow payment methods; no rate limit; a cancelled build could reset a new one; a late photo date could overwrite the user's date; final render could fail needlessly; double-counted analytics | `no_payment_required` accepted; cards only; per-instance rate limits and Origin required; only the current build may update the screen; user dates always win; 20 KB label margin; events counted once and bucketed | Unit + E2E |

Accepted, not fixed (with reasons): the unlock is checked in the browser only, so a technical user can bypass it. For an
A$29 tool that works offline that is acceptable, and tokens are signed so they can be checked later. Refunds don't
revoke unlocks. Rate limits are best effort on serverless. `'unsafe-inline'` scripts stay (Next.js needs them without
nonces; nonces would force every page to render dynamically). pdf.js v6 no longer evaluates code from fonts, so there
was no eval switch to turn off (checked in the bundled worker).

---

## Review E: red team

| # | Sev. | Finding | Fix | Retest |
|---|---|---|---|---|
| E-C1 | Critical | Guessed dates were printed as fact on lodged evidence (a WhatsApp save date over the photo's own date); false information can trigger refusal under PIC 4020 | A photo's EXIF date beats its file name; WhatsApp and screenshot file-name dates are ignored; automatic dates are marked "Not checked" and **never printed** until the user confirms them ("Check dates") | E2E `automatic dates are used for order but never printed until checked` (reads the PDF text); unit tests |
| E-C2 | Critical | Drift toward unregistered "immigration assistance" (Migration Act s276/s280): the tool chose legal relationship categories, paraphrased the regulations, and gave unverified attachment-limit guidance | The tool no longer puts files in groups: it labels what a file looks like and the applicant chooses the group. Group descriptions say only how a group is filed. Link to Home Affairs' own partner visa guidance. Neutral warnings. Attachment limit attributed to Home Affairs (30 to 60 depending on the application type) and asked of the user, never assumed | Unit tests (warnings contain no filing advice); E2E core journey |
| E-H1 | High | Privacy copy over-promised ("we couldn't see them if we wanted to", CSP "blocks" sending, Wi-Fi test on a phone with mobile data, analytics fields not listed) | Copy limited to what the code does; Airplane-mode check; every analytics field listed; photo-date and HEIC code preloaded for offline use | E2E offline build (with the photo date) |
| E-H2 | High | Safari can clear saved files after 7 days; storage-full errors were silent; paying redirected away from files that might not be saved | Persistent storage requested; storage-full is reported; checkout opens in a new tab so the built pack stays put; unlock kept in memory if storage is blocked; FAQ and privacy copy explain the 7-day rule | E2E checkout in a new tab |
| E-H3 | High | File names with spaces, brackets and "&" may be rejected by ImmiAccount | Letters, numbers and underscores only (`01_Financial_evidence_part1of2.pdf`) | E2E checks every output name; a real upload test is on the go-live checklist |
| E-H4 | High | The example pack understated how many attachments photos use | Realistic example; default photo size 1600 px; "Smaller photos" setting; estimates updated | Unit tests for estimates |
| E-H5 | High | Wrong group suggestions ("Statement from John" filed with bank statements) accepted with one tap | No group suggestions at all; "statement" alone is no longer read as a bank document | Unit tests for document types |
| E-H6 | High | "Add more and rebuild" invited duplicate uploads (attachments can't be removed) | "First file number" setting; FAQ and result note | E2E `numbering can carry on after files already uploaded` |
| E-H7 | High | Long screenshots shrunk until unreadable | Scrolling captures (over 2.6:1) cut into phone-screen-sized pages; the fixer makes a PDF | E2E long chat screenshot (builder and fixer) |
| E-M1 | Medium | Non-Latin titles print as "?" | Warnings in the plan and the file sheet; safe fallback file names | Unit test |
| E-M2 | Medium | Licence wording inconsistent; refund wording risked being a "warranty against defects"; no terms at the point of sale; operator details could be missing | One licence wording; "Changed your mind? Full refund within 30 days, for any reason."; terms link and disclaimer at the paywall, on the builder and in Stripe Checkout; production build stops without operator name and email; ABN and business-name note in the deploy guide | E2E; build check |
| E-M3 | Medium | Outcome wording ("Lodge with confidence", "Ready for ImmiAccount") | "Upload with fewer surprises"; "Done: under 5 MB, in an accepted format"; "sized and sorted for ImmiAccount" | E2E text assertions |
| E-M4 | Medium | Phones: whole pack in memory, no wake lock | See B-M3; screen wake lock while building | Code review only (headless browsers have no screen to keep awake) |
| E-M5 | Medium | Success banner stayed green when files were left out | Headline says how many were left out, with the list above the paywall | E2E unusable files |
| E-M6 | Medium | TIFF wrongly called "not accepted by ImmiAccount" | "LodgeReady can't use this file type" | Unit test |
| E-M7 | Medium | "About ten minutes" and "every page explains itself" | Removed; untitled phone photos print as "Photo (IMG_4821)" | E2E PDF text check |
| E-L | Low | "Made in Australia", Office metadata, year-only dates, arrow keys, hover-only lock note, Variant B "worked for us", "Build my pack, free", shared computers, CSP smoke test | Removed or fixed (FAQ notes, `Lease 2023` dates, arrow keys, visible labels, neutral outreach, "Try it free", privacy note, `curl` check in the deploy guide) | Unit + E2E |

Not fixable in code: **a migration-law opinion before the first sale** (estimated A$220–500). The product now stays on
the clerical side as far as we can design it, but only a lawyer can confirm that. This is a decision for the founder.

---

## Review A: CEO (after the B/D/E fixes)

Verdict: **GO for validation** (deployment stays the founder's decision); nothing critical. The constraint on the first
sale is reaching couples in the weeks before they lodge, not the product.

| # | Sev. | Finding | Fix | Retest |
|---|---|---|---|---|
| A-H1 | High | Free tier counted "files" ambiguously (input documents vs output PDFs) and "preview a pack of any size" wasn't true while locked | "Up to 10 documents (any number of pages)"; "attachments" for outputs; a real watermarked preview now exists (see C1) | E2E restore/preview test; screenshots |
| A-H2 | High | Launch called "A$0" but trading as "LodgeReady" needs an ABN and a business name (~A$45 a year) | Checklist retitled A$0–45; "Before the first live sale" decisions added; REPORT corrected | Docs |
| A-H3 | High | "30 to 60 attachments" was credited to Home Affairs, but the only source is a 2015 embassy guide; a migration blog says 100 for partner visas | No range is quoted any more: "the limit depends on the application type, check yours"; presets 30/60/100/Other; link to Home Affairs' additional-documents form | E2E limit test |
| A-M1 | Medium | Example pack assumed unlocked statements | Caption says so, and that locked ones take more space | Screenshot |
| A-M2 | Medium | Refunds and shared links never switched off an unlock | Verify refuses refunded/disputed payments; `REVOKED_SESSIONS` switch; terms say so (already-unlocked browsers keep working offline: accepted) | Typecheck; code review |
| A-M3 | Medium | Netlify free plan's 300-credit cap (15 per production deploy; sites pause when exhausted) undocumented | Documented, with a plan | Docs |
| A-M4 | Medium | Outreach Variant B drifted into presentation advice; direct messages lacked Spam Act identification and opt-out | Variant B now quotes only the technical rules; stock answer for "which group?"; full-name sign-off and opt-out on every direct message | Docs |
| A-M5 | Medium | Stopping rule needed PostHog but analytics was optional; three different definitions of a sale | PostHog required for the validation window; one definition of a sale | Docs |
| A-M6 | Medium | Docs disagreed on when to get the legal opinion | Both positions stated; founder decides (before the first sale, or at the latest before commissions, ads or the 10th sale) | Docs |
| A-L | Low | Lost-link process, statement descriptor, "don't email us documents", what happens if the service closes, LGPL notice for libheif, stale doc references | All added or corrected | Docs |

## Review C: CPO (after the B/D/E fixes)

| # | Sev. | Finding | Fix | Retest |
|---|---|---|---|---|
| C1 | Critical | Nothing to look at before paying: only file names | Watermarked preview of every built PDF (first pages while locked; the index in full) | E2E `restoring a purchase…` opens a preview; screenshots |
| C2 | High | Users couldn't look at their own files | File details shows the photo and an "Open the file" link (opens from this device) | a11y E2E on the file sheet |
| C3 | High | "All N dates are right" was the only fast path; "Change" closed the sheet | One-tap "Right" per date; changing a date returns to the sheet | E2E core journey; a11y |
| C4 | High | After a self-unlock, the unlock link was never shown | "Save your unlock link" card (copy, email to myself) after unlocking and in the privacy sheet | E2E restore test |
| C5 | High | A pack over the limit was shown as "ready"; earlier uploads not counted | "Over your attachment limit" result with one-tap fixes; earlier uploads count | Unit test; screenshot |
| C6 | High | Not tested at real sizes or in Safari; in-app browsers (Facebook, Instagram, TikTok) break downloads | In-app-browser banner; new funnel events (`build_started`, `over_limit`…). **Real-device tests can't be done here: founder action** | — |
| C7–C13 | Medium | Too many notices; "files" meant three things; groups unexplained; price shown late; checkout loose ends; no bulk labelling; adding evidence later | Wording unified (files in, attachments out); raster note moved onto each file; price line in Add; "I've paid" says when nothing arrived; Cancel; checkout tab shows only "Close this tab"; restore happens in place; no bulk move for "Couldn't tell". Deferred: bulk labelling, "mark as uploaded", undo | E2E |
| C-L | Low | Broken dates in titles, iPhone screenshots titled as photos, folder-picker "upload" wording, metrics gaps | "2025-01" kept; PNG camera names are "Screenshot (…)"; note under the folder button; events added; purchase counted once from whichever tab confirms | Unit + E2E |

---

## Review F: final investment committee

**Found in this review, Critical: text in generated PDFs was mostly blank.** Rendering a built pack (pdf.js and,
independently, poppler) showed contents pages, captions and the index drawn with most glyphs missing. pdf-lib's font
subsetting mishandled the full, hinted Noto Sans files; every earlier test read the text layer (correct) rather than the
drawn page. Fix: fonts pre-trimmed with fonttools (hinting removed, Latin/Vietnamese/Greek/Cyrillic kept;
`scripts/subset-fonts.sh`), font URLs versioned so cached copies are replaced, and a regression test that renders a real
page with poppler and counts ink (it fails on the old fonts, passes on the new). Re-checked by eye in both renderers.

**Evidence now:** 99 unit tests; 45 end-to-end tests on desktop and an iPhone-sized viewport (real PDFs, HEIC, locked
and oversized files, offline building, accessibility with axe, 44 pt targets, checkout and restore with Stripe mocked);
typecheck and lint clean; screenshots reviewed in light and dark mode.

**Not verified (cannot be done from here):** Safari/WebKit and real phones (the iPhone tests run Chromium); packs of
150–400 files on a phone; a real Stripe payment; a real ImmiAccount upload of the file-name patterns; the current
attachment limit for 820/801 and 309/100.

**Decision: GO to validation, conditional on the founder's approvals.** The product does what it says, the claims match
the code, and the remaining risks are distribution, legal positioning and real-device behaviour, none of which more
code in this session can retire.

Conditions before the first real customer:
1. Founder approves and performs: Stripe account, Netlify deploy, environment variables, smoke test (DEPLOY.md).
2. Trading-name decision (register "LodgeReady" ~A$45/yr, or trade under own name).
3. Real-device check: one 100+ file pack on an iPhone (Safari) and an Android phone; one draft ImmiAccount upload.
4. Legal opinion timing decided (A$220–500).
5. PostHog project with IP discarding switched on for the validation window.

Biggest risk: reaching couples in the few weeks before they lodge, in communities that restrict self-promotion.
Fallback if the stopping rule triggers: see VALIDATION_PLAN.md.
