# Go-live checklist (about 45 minutes, A$0)

Nothing below has been done for you. Each step publishes something or creates an account in your name, so each
one needs you.

## 1. Stripe (payments) — free to set up
1. Create an account at stripe.com/au. Choose **Individual / sole trader**. An ABN is optional for sole traders.
2. **Settings → Public details:** business name `LodgeReady`, support email, website (your Netlify URL, once you have it).
3. **Settings → Emails:** turn on **"Successful payments"** so buyers get a receipt.
4. Copy your **secret key** from Developers → API keys. Start with the **test** key (`sk_test_…`) and switch to the
   live key (`sk_live_…`) once the test purchase in step 4 works.

Fees: 1.65% + A$0.30 for Australian cards (≈ A$0.78 on A$29), and 3.5% + A$0.30 for international cards until April 2027.

## 2. Netlify (hosting) — free plan, commercial use allowed
1. Sign in at app.netlify.com with GitHub → **Add new site → Import an existing project** → choose
   `travex-pixel/Thrive` and branch `ccr-ad122ae0-am60ag` (or `main` after you merge).
2. Netlify reads `netlify.toml`: build command `npm run build`, Node 22. Leave the defaults.
3. **Site configuration → Environment variables** (add all of these *before* the first deploy):

| Variable | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<your-site>.netlify.app` (no trailing slash) | Yes |
| `STRIPE_SECRET_KEY` | `sk_test_…` first, then `sk_live_…` | Yes |
| `LICENSE_SIGNING_SECRET` | Run `openssl rand -hex 32` and paste the result (keep it secret, never change it) | Yes |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | The inbox you'll answer refund and support emails from | Yes |
| `NEXT_PUBLIC_OPERATOR_NAME` | e.g. `Jane Citizen trading as LodgeReady` | Yes (shown in Privacy and Terms) |
| `NEXT_PUBLIC_OPERATOR_ABN` | Your ABN | Optional |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public project key `phc_…` (see METRICS.md) | Optional |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` or `https://eu.i.posthog.com` | Optional |

> `NEXT_PUBLIC_*` values are built into the page and are visible to visitors. That's expected for these. The two
> secrets (`STRIPE_SECRET_KEY`, `LICENSE_SIGNING_SECRET`) are only used by the server routes and never reach the browser.

4. Deploy. Changing an environment variable later requires a redeploy (**Deploys → Trigger deploy**).

## 3. Smoke test on the live site (before telling anyone)
- [ ] The home page loads on your phone and on a computer, in light and dark mode.
- [ ] `/fix`: drop an iPhone photo and download the JPG.
- [ ] `/build`: add 5–10 real files (your own, or the test fixtures in `tests/fixtures/`), sort them, build, and download the ZIP.
      Open every PDF.
- [ ] Privacy check: once the builder has loaded, turn off Wi-Fi and build again. It should still work.
- [ ] Add 11+ files and build. The paywall appears. Click **Unlock** and pay with Stripe's test card `4242 4242 4242 4242`
      (any future date, any CVC). You land on "You're unlocked" and downloads work.
- [ ] Switch to the **live** key, redeploy, buy once with your own card, then **refund yourself** in Stripe.
      *This is a test transaction. It is not revenue and must not be counted.*
- [ ] Privacy and Terms show your operator name and support email.

## 4. Optional
- **Custom domain** (≈ A$15–25 a year for `.com.au`, which needs an ABN, or ≈ A$15–20 for `.com`). Not needed for the
  first sale. Buy one only after the validation test shows traction.
- **Merchant of record** (Polar, ≈ 4–5% + US$0.40–0.50 per sale): consider it only if overseas sales become material,
  since it handles foreign VAT and GST for you.

## Fallback hosting
The app is a standard Next.js app. Any Node host that runs `npm run build && npm start` works (Render, Railway, Fly.io,
a VPS). Vercel's free Hobby plan is **personal use only**, so it isn't suitable for a paid product.
