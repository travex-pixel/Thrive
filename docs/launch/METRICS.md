# Measurement plan

Measure the funnel without compromising the privacy promise. No file names, titles, dates or contents are ever
sent. See `src/lib/analytics.ts`.

## Set-up (optional, ~10 minutes, A$0 on PostHog's free tier)
1. In PostHog, create a **separate project called "LodgeReady"**. Your existing "Default project" already holds events
   from something else, so don't mix the two.
2. In that project's settings, turn on **"Discard client IP data"**. The privacy policy says IP addresses are discarded,
   so this setting is required.
3. Copy the project's public key (`phc_…`) into Netlify as `NEXT_PUBLIC_POSTHOG_KEY`, and set `NEXT_PUBLIC_POSTHOG_HOST` to
   your region's ingest host. Redeploy.

If you skip this, the app works the same and sends no analytics at all. Use Stripe and Netlify for the basic numbers instead.

## Events (all anonymous, one random ID per browser tab)
| Event | Fired when | Properties |
|---|---|---|
| `landing_viewed` | Home page loads | `ref` |
| `builder_opened` | /build loads | `files_bucket`, `unlocked`, `ref` |
| `files_added` | Files are added | `count_bucket` |
| `pack_built` | A build finishes | `files_bucket`, `docs` (bucketed), `seconds_bucket` |
| `build_failed` | A build errors | (none) |
| `paywall_shown` | A locked pack is built | `files_bucket` |
| `checkout_started` | Unlock is clicked | `files_bucket` |
| `checkout_unavailable` | Checkout refused (payments not configured, or the site address isn't allowed) | `result` (`503` or `403`) |
| `purchase_verified` | /unlock confirms a payment, once per browser | `result` (`new` or `restore`) |
| `download_clicked` | A single file or the ZIP is downloaded | `kind` |
| `fixer_used` | The free fixer finishes | `kind`, `result` |

`ref` comes from the `?ref=` code on the link someone followed, so you can see which channel worked.

## The funnel to watch (weekly)
`landing_viewed → builder_opened → files_added → pack_built → paywall_shown → checkout_started → purchase_verified (result=new)`

**Diagnosis:**
- A drop at **builder_opened**: weak landing or hero.
- A drop at **files_added**: lack of trust ("will my files be uploaded?").
- A drop at **pack_built**: sorting is too much work, or bugs.
- A drop at **checkout_started**: price or value.
- A drop at **purchase_verified**: checkout friction.

## Money states: report each one separately, never blended
| State | Source | Counts as revenue? |
|---|---|---|
| Interest ("this is great") | `tracker.csv` | No |
| Verbal commitment ("I'll buy it next week") | `tracker.csv` | No |
| Checkout started | PostHog `checkout_started` | No |
| Completed transaction | Stripe → Payments (live mode) | Not yet. Wait for the refund window and payout |
| Revenue received | Stripe payout to your bank | **Yes** (gross) |
| Profit | Revenue − Stripe fees − refunds − hosting (A$0) − domain (if bought) | **Yes** (net) |

Your own test purchases and Stripe test-mode payments are **never** revenue.

## Weekly review template (copy into tracker notes)
- Qualified prospects contacted: __
- Replies or conversations: __
- Demos shown: __
- Visitors (landing + /fix): __, of which with a `ref`: __
- Packs built: __; paywalls shown: __; checkouts started: __
- Purchases (live, not refunded): __; revenue received: A$__
- Costs (Stripe fees, hosting, domain): A$__; refunds: __
- Top objection, word for word: "__"
- One change for next week (one variable only): __
