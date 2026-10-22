# Validation experiment: will couples pay A$29 to get their partner visa evidence sized and sorted for ImmiAccount?

## Hypothesis
DIY partner-visa applicants who are 2–8 weeks from lodging will pay **A$29 once** for a private tool that turns their
messy evidence into numbered PDFs sized for ImmiAccount, **once they've seen their own pack built for free**.

## The offer (what is live)
- **Free:** the single-file fixer (unlimited), plus building, previewing and downloading packs of up to 10 files.
- **A$29 one-off:** unlimited files and rebuilds in the browser where they pay, a full refund within 30 days if they change their mind, and an unlock link for other browsers and devices.
- **Promise:** files never leave the device. Users can verify this by turning on Airplane mode once the page has loaded.

## Who counts as a qualified prospect
Count someone as qualified only if **all** of these are true:
1. They are preparing (or adding to) an Australian partner visa: 820/801, 309/100 or 300.
2. They are lodging **without** a migration agent.
3. They have a file problem we solve: too big, HEIC, locked PDF, too many files, or messy organisation.
4. They are lodging within about 8 weeks, or adding evidence soon.

Not qualified:
- People using an agent (the agent handles uploads).
- People asking *what evidence is enough*. We can't advise; point them to Home Affairs and registered agents.

## Channels, in order of expected yield
| # | Channel | How to find 20 prospects | Rules |
|---|---|---|---|
| 1 | r/AusVisa | Search posts from the last 30 days for: `evidence`, `upload`, `attachments`, `5MB`, `file size`, `HEIC`, `ImmiAccount`, `organise`, `820`, `309`. Reply where the question is about files or organising | Read the sub's rules first. Be helpful first, always disclose. If links aren't allowed, answer without one, or ask the mods |
| 2 | Forums: ExpatForum (Australia), Poms in Oz, Whirlpool (Immigration) | Same keywords in partner-visa threads | Same |
| 3 | Facebook partner-visa groups | Search Facebook for "partner visa Australia" groups | **Message the admin first.** Never post without permission |
| 4 | DIY blog comment sections | e.g. Brooke Beyond's "Uploading evidence to our 820/801…" post has many reader questions | Answer the question first. Email the blog owner separately (see OUTREACH.md) |
| 5 | Partner-visa creators (TikTok, Instagram, YouTube) | Creators documenting their 820/309 journey | Offer free access plus a discount code for their audience. Disclose any commission |

Tag every link you share with a `?ref=` code so you can see which channel worked, e.g.
`https://<site>/fix?ref=reddit-ausvisa`, `?ref=expatforum`, `?ref=fb-<groupname>`, `?ref=creator-<name>`.

## What to measure (see METRICS.md)
Visitors → builder opened → files added → pack built → paywall shown → checkout started → **purchase**.
Plus refunds and the replies you get.

## Stopping rule (decide now, not later)
The window is **14 days from your first public post or message.** Minimum effort: **20 qualified replies or messages**
across at least 3 channels, plus 5 creator or blog-owner messages.

| Result after 14 days | Decision |
|---|---|
| **≥ 3 purchases from 3 different couples** (≥ A$87 gross, after refunds) | **Continue.** Write SEO pages for the top 3 search problems, approach more creators, and consider raising the price to A$39 |
| 1–2 purchases | **Iterate** for another 14 days. Interview every buyer and every non-buyer who built a pack. Change one variable at a time |
| 0 purchases, **≥ 100 qualified visitors and ≥ 20 paywall views** | The **offer, price or trust** is wrong. Try a preview of built pages, real testimonials (with permission), and A$19 |
| 0 purchases, **< 100 qualified visitors** | The **channel** is the problem, not the product. Try creators or blogs, or paid search capped at A$50 (only with your approval) |
| 0 purchases after 30 days despite changes | **Stop.** Fall back to the cash path (Airtasker data-entry service) or revisit the runner-up niche (`docs/research/REPORT.md`) |

**Counting rules:**
- Interest, likes and "I'd pay for this" are not validation.
- Stripe test payments, your own purchase, and anything refunded **do not count** as revenue.

## Day-one plan (after go-live)
1. Smoke-test the live site (DEPLOY.md §3). (30 min)
2. Find 10 qualified threads (Reddit and forums) and reply to 5 of them with Variant A or B. Log each in `tracker.csv`. (60 min)
3. Message 2 Facebook group admins (Variant C) and 2 creators (Variant D). (20 min)
4. Record the 60-second demo video (DEMO_SCRIPT.md) for creators and admins. (30 min)
5. At the end of the day: check the PostHog funnel and Stripe, and update the tracker. (10 min)
