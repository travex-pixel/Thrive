# Go-live checklist (about 45 minutes, A$0–45)

Nothing below has been done for you. Each step publishes something or creates an account in your name, so each
one needs you.

## 1. Stripe (payments) — free to set up
1. Create an account at stripe.com/au. Choose **Individual / sole trader**.
   - Trading under any name other than your own (for example "LodgeReady") needs a **registered business name**, and
     that needs an **ABN** (free from abr.gov.au). Registering the name with ASIC costs roughly A$45 for a year; check
     asic.gov.au for the current fee. This is a decision for you before the first live sale.
2. **Settings → Public details:** business name `LodgeReady`, support email, website (your Netlify URL, once you have it).
3. **Settings → Emails:** turn on **"Successful payments"** so buyers get a receipt.
4. Copy your **secret key** from Developers → API keys. Start with the **test** key (`sk_test_…`) and switch to the
   live key (`sk_live_…`) once the test purchase in step 4 works.

Fees: 1.65% + A$0.30 for Australian cards (≈ A$0.78 on A$29), and 3.5% + A$0.30 for international cards until April 2027.

## 2. Netlify (hosting) — free plan
Netlify's free plan has a monthly allowance of **300 credits**, and each **production deploy uses 15**. When the
credits run out, every site on the account is paused until the next month. So: test on deploy previews (free), batch
production deploys, and decide now what you'd do if it runs low (the Personal plan is about US$9 a month and needs your
approval). Commercial use appears to be allowed on the free plan (a Netlify staff answer says so), but check the current
terms yourself.

1. Sign in at app.netlify.com with GitHub → **Add new site → Import an existing project** → choose
   `travex-pixel/Thrive` and branch `ccr-ad122ae0-am60ag` (or `main` after you merge).
2. Netlify reads `netlify.toml`: build command `npm run build`, Node 22. Leave the defaults.
3. **Site configuration → Environment variables** (add all of these *before* the first deploy):

| Variable | Value | Required |
|---|---|---|
| `SITE_URL` | `https://<your-site>.netlify.app` (no trailing slash). Read by the payment routes at request time, so it can change without a rebuild | Yes |
| `ALLOWED_ORIGINS` | Extra addresses allowed to start checkout, comma-separated (a custom domain, a `www.` alias, a deploy-preview URL) | Optional |
| `NEXT_PUBLIC_SITE_URL` | Same as `SITE_URL`. Used for page metadata and the sitemap | Yes |
| `STRIPE_SECRET_KEY` | `sk_test_…` first, then `sk_live_…` | Yes |
| `LICENSE_SIGNING_SECRET` | Run `openssl rand -hex 32` and paste the result (keep it secret, never change it) | Yes |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | The inbox you'll answer refund and support emails from | Yes. The production build stops without it |
| `NEXT_PUBLIC_OPERATOR_NAME` | e.g. `Jane Citizen trading as LodgeReady` | Yes (shown in Privacy and Terms). The production build stops without it |
| `NEXT_PUBLIC_OPERATOR_ABN` | Your ABN | Optional |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public project key `phc_…` (see METRICS.md). Set it **only after** turning on "Discard client IP data" in that PostHog project: the privacy policy says IP addresses are discarded | Optional |
| `REVOKED_SESSIONS` | Unlock links to switch off, comma-separated `cs_live_…` ids (e.g. one posted publicly). Refunded purchases are refused automatically | Optional |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` or `https://eu.i.posthog.com` | Optional |

> `NEXT_PUBLIC_*` values are built into the page and are visible to visitors. That's expected for these. The two
> secrets (`STRIPE_SECRET_KEY`, `LICENSE_SIGNING_SECRET`) are only used by the server routes and never reach the browser.

4. Deploy. Changing an environment variable later requires a redeploy (**Deploys → Trigger deploy**).

## 2b. Vercel (alternative) — free for a preview, paid once you sell
Vercel runs this app without changes. Its free **Hobby plan is for personal, non-commercial use**, so it's fine for
looking at the site, but taking payments there means the **Pro plan (about US$20 a month)**, which needs your approval.
To preview:
1. Sign in at vercel.com with GitHub → **Add New → Project** → import `travex-pixel/Thrive`.
2. Framework: Next.js (detected). Leave the build settings as they are; Node 22 comes from `package.json`.
3. Deploy. The project's production branch is the repo's default branch, so to see this work either open the
   **preview deployment** for branch `ccr-ad122ae0-am60ag` (previews are private to your Vercel account by default),
   or set Settings → Git → Production Branch to that branch.
4. A **production** deployment stops on purpose unless `NEXT_PUBLIC_OPERATOR_NAME` and `NEXT_PUBLIC_SUPPORT_EMAIL` are
   set (Settings → Environment Variables), exactly as on Netlify. Previews don't need them.
5. Payments stay off until `STRIPE_SECRET_KEY` and `LICENSE_SIGNING_SECRET` are set; the Unlock button says so.
6. **"No Production Deployment" and a production branch that doesn't exist?** Vercel picked the branch at import time.
   Change it under Settings → Git → Production Branch to `ccr-ad122ae0-am60ag` (after adding the two operator variables),
   or just open the latest **Preview** deployment of that branch from the Deployments tab: every push creates one.
   Checkout accepts Vercel's own deployment addresses automatically; add a custom domain to `SITE_URL`.

## 3. Smoke test on the live site (before telling anyone)
- [ ] The home page loads on your phone and on a computer, in light and dark mode.
- [ ] `/fix`: drop an iPhone photo and download the JPG.
- [ ] `/build`: add 5–10 real files (your own, or the test fixtures in `tests/fixtures/`), sort them, build, and download the ZIP.
      Open every PDF.
- [ ] Privacy check: once the builder has loaded, turn on Airplane mode (Wi-Fi *and* mobile data off) and build again.
      It should still work, including an iPhone HEIC photo.
- [ ] Security headers: run `curl -sI https://<your-site>/build | grep -i content-security-policy` and check the policy
      appears, with `connect-src 'self'` (plus your PostHog host if you set one). Repeat for `/` and `/fix`.
- [ ] Add 11+ files and build. The paywall appears. Click **Unlock**: Stripe checkout opens in a new tab. Pay with Stripe's
      test card `4242 4242 4242 4242` (any future date, any CVC). The checkout tab says "You're unlocked", and the
      builder tab unlocks by itself with the pack still there. Downloads work.
- [ ] Restore: in a private window, open the unlock link from the success page. It unlocks that window too.
- [ ] Switch to the **live** key, redeploy, buy once with your own card, then **refund yourself** in Stripe.
      *This is a test transaction. It is not revenue and must not be counted.*
- [ ] Privacy and Terms show your operator name and support email.
- [ ] File names: if you (or a friend with consent) have a draft ImmiAccount application, upload one file of each name
      pattern (`00_Evidence_index.pdf`, `01_Financial_evidence_part1of2.pdf`, `05_Identity_Passport.pdf`) and check it is
      accepted. Never use a real, submitted application for testing: attachments can't be removed.

## Before the first live sale (your decisions)
- **Trading name:** register "LodgeReady" as a business name (needs an ABN; about A$45 a year) **or** trade under your
  own name everywhere (Stripe public details, statement descriptor, operator name on the legal pages).
- **Card statement descriptor:** Stripe → Settings → Public details → set it to `LODGEREADY` so buyers recognise the charge.
- **GST:** the terms say the price includes GST "if any applies". If you're not registered for GST, you may prefer
  "No GST is charged".
- **Lost unlock links:** to resend one, find the payment in Stripe, open its Checkout Session (`cs_live_…`) and send
  `https://<your-site>/unlock?session_id=<that id>` to the buyer's email.
- **Legal check** of the clerical-tool positioning (A$220–500): see REPORT.md, decision 3.

## 4. Optional
- **Custom domain** (≈ A$15–25 a year for `.com.au`, which needs an ABN, or ≈ A$15–20 for `.com`). Not needed for the
  first sale. Buy one only after the validation test shows traction.
- **Merchant of record** (Polar, ≈ 4–5% + US$0.40–0.50 per sale): consider it only if overseas sales become material,
  since it handles foreign VAT and GST for you.

## Fallback hosting
The app is a standard Next.js app. Any Node host that runs `npm run build && npm start` works (Render, Railway, Fly.io,
a VPS). Vercel's free Hobby plan is **personal use only**, so it isn't suitable for a paid product.
