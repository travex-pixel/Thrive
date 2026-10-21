# Research phase report — finding an app that earns its first A$1

Prepared 2026-10-21. Every finding came from web-search index summaries. Pages were not fetched
directly because this environment's network policy blocked direct access to nearly every site,
including reddit.com, news.ycombinator.com, apps.apple.com, capterra.com.au, ndis.gov.au,
trustmrr.com and wikipedia.org. Raw cluster notes are in [`clusters/`](clusters/).

Evidence tags: **[FACT]** verified fact (as indexed) · **[COMPLAINT]** customer complaint ·
**[SPEND]** evidence of existing spending/prices · **[INFERENCE]** · **[ASSUMPTION]**.

---

## 1. Method and limitations (read first)

- Six research agents covered six market clusters in parallel, then I ran red-team checks myself.
  About 220 web searches in total.
- **Web search was capped at 200 queries per turn, shared across all agents.** Cluster 6
  (emerging changes) ran no searches at all, so its findings are unverified prior knowledge and
  are scored as hypotheses only.
- I found **no direct customer quotes from Reddit or Facebook**, because both were unreachable. The
  complaint evidence comes from app-store reviews, Trustpilot, Xero Product Ideas, vendor support pages and blogs.
- Verified revenue figures come from TrustMRR, which reads revenue from Stripe, as surfaced in the search index.
  Revenue figures for the global leader BankStatementConverter.com are secondary (interviews and podcasts).

## 2. The single most important finding

**In late 2026, almost every niche you can find by web search already has several small,
often AI-built tools in it.** Across about 60 opportunities, nearly every "obvious gap" turned up three
to fifteen competitors, many of them launched in 2025–26:

- NDIS invoicing: 10+ tools at A$0–49/mo.
- AI SWMS generators: 15+.
- AI shift notes: 6+.
- Bank-statement converters: 10+, including three that run entirely in the browser.
- Partner-visa evidence tools: 6+.

Verified indie revenue in these niches is **small**:
- An Australian bank-statement converter took US$746 in 30 days and US$1,515 all-time (TrustMRR).
- MakeSWMS (an AI SWMS tool) took US$41 in 30 days from 2 subscribers (TrustMRR).

**What this means:** building is commoditised. Build speed and "an AI version of X" are no longer an
edge. The winner has to be chosen for **buyer urgency, a price low enough to buy on impulse, buyers gathered in
a few reachable places, and a difference buyers care about**. Ideas that rely on being the only product
in a market don't hold up.

## 3. Ranked opportunity table (24 scored)

Weights: Demand 25 · Reach 20 · Willingness to pay (WTP) 20 · Build speed 15 · Differentiation 10 · Opex 10.
These are my final scores after cross-checking between clusters. They differ from the agents' first-pass scores where new
evidence changed the picture: the VisaBinder A$99 price anchor, the StatementSheet discovery and the
TrustMRR revenue data.

| Rank | Opportunity | D | R | W | B | Df | O | **Total** | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Partner-visa evidence pack builder, runs entirely on the device | 17 | 11 | 12 | 11 | 4 | 9 | **64** | **Winner** |
| 2 | AU bank-statement PDF → CSV/Xero converter (private, reconciled) | 16 | 9 | 15 | 9 | 2 | 9 | **60** | Runner-up; killed on differentiation |
| 3 | Receipts/statements → spreadsheet data entry, sold on Airtasker (service) | 14 | 14 | 9 | 12 | 2 | 5 | **56** | Fallback for cash |
| 4 | Test & tag register + automatic retest rebooking (B2B) | 12 | 14 | 10 | 8 | 5 | 6 | **55** | Third; park |
| 5 | Support at Home supplier invoice + evidence kit | 12 | 9 | 6 | 13 | 6 | 8 | **54** | Park |
| 6 | Fencing quotes with neighbour cost split | 9 | 12 | 5 | 11 | 6 | 9 | **52** | Park |
| 7 | AML/CTF Tranche 2 customer-checks helper for sole practitioners | 18 | 12 | 12 | 4 | 2 | 3 | **51** | Kill (liability, funded incumbents) |
| 8 | SCHADS sleepover / pay-point self-audit | 14 | 12 | 9 | 6 | 4 | 5 | **50** | Park |
| 9 | NDIS invoice sheet with price-limit checks (Etsy) | 12 | 10 | 7 | 12 | 3 | 6 | **50** | Kill as a business |
| 10 | AU BAS/GST workbook (Etsy) | 9 | 10 | 7 | 14 | 2 | 8 | **50** | Kill as a business |
| 11 | TLS certificate-renewal runbook for small IT providers (unverified) | 12 | 10 | 8 | 9 | 4 | 7 | **50** | Hypothesis only |
| 12 | Xero repeating-invoice bulk price-rise | 12 | 9 | 10 | 7 | 5 | 6 | **49** | Park (API/trust, seasonal) |
| 13 | Security of Payment payment-schedule deadline alerts for builders | 12 | 9 | 9 | 9 | 5 | 5 | **49** | Park |
| 14 | AI SWMS generator | 15 | 8 | 5 | 13 | 1 | 7 | **49** | Kill (saturated) |
| 15 | Small-job building contracts + variations | 12 | 10 | 8 | 9 | 5 | 5 | **49** | Park |
| 16 | APS selection-criteria checker | 14 | 8 | 6 | 13 | 2 | 6 | **49** | Kill |
| 17 | Early-childhood documentation (AI) | 15 | 12 | 6 | 10 | 1 | 5 | **49** | Kill |
| 18 | VIC rental energy-standards pack (from 1 Mar 2027) | 11 | 8 | 6 | 11 | 5 | 6 | **47** | Park |
| 19 | Marriage celebrant admin | 9 | 15 | 5 | 10 | 2 | 6 | **47** | Kill |
| 20 | Gmail POP-fetch replacement (unverified) | 14 | 9 | 7 | 8 | 6 | 3 | **47** | Kill (credential risk) |
| 21 | AU privacy automated-decision disclosure kit (10 Dec 2026) | 8 | 8 | 6 | 12 | 4 | 9 | **47** | Kill |
| 22 | NDIS invoicing app | 14 | 9 | 6 | 10 | 1 | 5 | **45** | Kill (saturated) |
| 23 | Microsoft Publisher .pub rescue (unverified) | 10 | 11 | 5 | 7 | 3 | 6 | **42** | Kill |
| 24 | Payday Super exceptions view | 10 | 10 | 5 | 9 | 4 | 6 | **44** | Kill |

**Killed outright in the cluster reports** (summaries in `clusters/`): Xero attachment export,
Stripe invoice PDFs, Shopify bulk editor, cheaper Calendly/DocuSign/Typeform alternatives,
replacements for retired (Manifest V2) Chrome extensions, generic templates, Calendar→timesheet, Google Forms uploads, AI shift notes,
SOPA claim tools for subbies, a subbie compliance wallet, the QBCC financial-reporting (MFR) helper (requirement removed), wage-compliance
packs, climate supplier emissions tools, work-from-home/logbook records, a late-payment chaser, wedding seating,
generic landlord tools, UK MTD bridging software, EU e-invoicing, EU Accessibility Act tools and US BOI filing.

### The 13 required fields for the top 16

**1. Partner-visa evidence pack builder (fully on-device) — 64**
1. *Customer:* couples lodging an Australian partner visa (820/801, 309/100, 300) themselves, 2–8 weeks before lodging.
2. *Problem:* hundreds of scattered files (statements, leases, photos, chats, Form 888s) must become
   an orderly set split by evidence type that fits ImmiAccount limits. That means ≤5MB per file and a cap on attachments per applicant
   (60, or 100 for partner visas according to third parties). Attachments can't be deleted after submitting, and HEIC/WEBP images aren't accepted.
3. *Current workaround:* Google Drive folders, online PDF compressors (which upload files), Word index tables, A$10–30 templates, or paying an agent.
4. *Evidence:*
   - [FACT] 5MB limit, accepted file types, no deletion after submitting (Home Affairs help text).
   - [FACT] Primary applicant charge A$11,710 from 1 Jul 2026 (law-firm sources).
   - [FACT] ~40,500 partner visas a year.
   - [FACT, old] FOI data show ~60% of applications lodged without an agent (2015–17).
   - [COMPLAINT] Template seller: "I tried to DIY everything and it ended up messy".
   - [INFERENCE] A DIY blog's upload post runs to 5+ comment pages.
5. *Competitors:* VisaBinder (**A$99 one-off, stored on its servers in Sydney**), VisaPacks (freemium; 3 free compressions),
   VisaAlbum (US$29+), ImmiFrame (desktop), Immigration Vault, Tern (free compressor), Payhip organisers (A$9.95–19.99).
6. *What customers pay now:* agents A$1,800–10,000; a one-off consult ~A$220; templates A$10–30; VisaBinder A$99.
7. *Our solution:* a browser tool that never uploads anything. Sort files by evidence type, and it builds date-ordered PDFs
   with captions, auto-split under 5MB, converts HEIC and WEBP, and produces an evidence index and an attachment-count plan. Building and previewing are free.
8. *Price:* A$29 one-off launch price (A$39 list), so about a third of VisaBinder.
9. *Time to first usable version:* 3–5 days.
10. *Cost:* A$0 to start (free hosting); A$0/month plus Stripe fees (1.65% + A$0.30 on domestic cards).
11. *Acquisition:* threads on r/AusVisa, ExpatForum, Poms in Oz and Whirlpool, plus DIY blog comment sections. Use a free single-file fixer as the hook.
12. *Main failure risk:* forums and groups ban promotion, and a crowded field makes it hard to be noticed.
13. *Confidence:* medium on pain and willingness to pay; low–medium on reach. *Unresolved:* community promotion rules, the official attachment cap.

**2. AU bank-statement converter (private, reconciled) — 60**
1. *Customer:* AU bookkeepers, BAS agents and individuals who have statements only as PDFs.
2. *Problem:* bank CSV exports are limited (CommBank ~600 recent transactions; ANZ 2 years), and Xero's PDF import works only in the US and Canada.
3. *Current workaround:* typing it in by hand, freelancers, generic converters.
4. *Evidence:*
   - [SPEND] An AU indie converter took US$746 in 30 days (TrustMRR).
   - [SPEND] The global leader is reportedly at US$11K–40K MRR.
   - [SPEND] Freelancer jobs at A$5–250.
   - [COMPLAINT] Xero idea thread, Xero response: "no work planned".
5. *Competitors:* StatementSheet (runs in the browser, reconciled, US$19 per batch, open source), Local Bank Statement Converter (free, offline),
   Offline Bank Statement Converter (US$129), AussieBankStatements, BankConv, DocuClipper and 6+ more.
6. *What customers pay now:* US$10–30/mo, US$19 per batch, US$2.99 per document.
7. *Our solution:* an AU-format converter that runs locally and reconciles balances.
8. *Price:* A$19 per job / A$29 a month.
9. *Time to first usable version:* 4–7 days. **I can't test against real AU bank PDFs here.**
10. *Cost:* A$0 to start / A$0 a month.
11. *Acquisition:* SEO (slow), bookkeepers via the Tax Practitioners Board register, Freelancer jobs.
12. *Main failure risk:* every differentiator is already taken, including privacy, reconciliation and Australian focus.
13. *Confidence:* high on demand, low on beating incumbents.

**3. Receipts/statements → spreadsheet data-entry service (Airtasker) — 56**
1. *Customer:* AU sole traders who are behind at BAS or tax time.
2. *Problem:* piles of receipts and statements.
3. *Current workaround:* doing it themselves or hiring a freelancer.
4. *Evidence:* [SPEND] Airtasker posted budgets of A$35–150; median data-entry job ~A$100–120.
5. *Competitors:* offshore freelancers at US$7.50+.
6. *What customers pay now:* A$35–150 per batch.
7. *Our solution:* AI-assisted transcription, with a balance tie-out.
8. *Price:* A$49 per batch.
9. *Time to first usable version:* 1–2 days.
10. *Cost:* A$0.
11. *Acquisition:* make offers on posted Airtasker tasks.
12. *Main failure risk:* labour, not product. Classifying GST for a fee is a BAS service needing Tax Practitioners Board (TPB) registration, so stick to transcription only.
13. *Confidence:* medium for first revenue, low as a product.

**4. Test & tag register + retest rebooking — 55**
1. *Customer:* test & tag businesses with 1–5 staff.
2. *Problem:* records are mandatory under AS/NZS 3760, construction gear is retested every 3 months, and rebooking retests is manual.
3. *Current workaround:* tester-maker PC software, Excel, paper.
4. *Evidence:*
   - [FACT] Record and tag requirements (SafeWork NSW, WorkSafe QLD).
   - [COMPLAINT] iCertifi app rated 1.0, citing data loss.
   - [SPEND] PATorganiser US$19/mo; iCertifi A$149.99/yr; ATS ~A$1,600 one-off.
5. *Competitors:* Seaward/Metrel bundled software, PATorganiser, iCertifi, Maptrack, Tap Tag, Jim's franchise systems.
6. *What customers pay now:* see Evidence.
7. *Our solution:* an offline web app with QR scanning, client registers and automatic rebooking emails.
8. *Price:* A$29/mo.
9. *Time to first usable version:* 7–10 days. It needs a backend for sync and email.
10. *Cost:* A$0–30/mo.
11. *Acquisition:* Google Maps listings and test & tag training providers.
12. *Main failure risk:* testers export straight into vendor software, so retyping results is a deal-breaker.
13. *Confidence:* medium-low.

**5. Support at Home supplier invoice kit — 54**
1. *Customer:* sole-trader cleaners, gardeners and support workers who invoice self-managed aged-care providers.
2. *Problem:* invoices are auto-rejected (Trilogy Care since 15 Dec 2025), proof of delivery is required, and there is a 60-day claim limit.
3. *Current workaround:* Word/Excel templates.
4. *Evidence:* [FACT] provider rejection rules. No complaints from suppliers themselves found.
5. *Competitors:* generic invoicing apps.
6. *What customers pay now:* unverified.
7. *Our solution:* an invoice + evidence-page generator.
8. *Price:* A$19 one-off.
9. *Time to first usable version:* 1–2 days.
10. *Cost:* A$0.
11. *Acquisition:* Google Maps "home care" sole traders.
12. *Main failure risk:* a low-volume, price-sensitive segment, and every provider wants a different format.
13. *Confidence:* low.

**6. Fencing split quotes — 52**
1. *Customer:* fencing contractors with 1–5 staff.
2. *Problem:* quoting the materials for each run, then splitting the cost between neighbours.
3. *Current workaround:* a per-metre rule of thumb or Excel.
4. *Evidence:* [FACT] only consumer and supplier calculators exist. No spend found.
5. *Competitors:* Tradify (A$40–51), ServiceM8, US-only fencing tools.
6. *What customers pay now:* general job-management subscriptions.
7. *Our solution:* run measurements → materials list → two quotes, one per neighbour.
8. *Price:* A$19/mo.
9. *Time to first usable version:* 3–5 days.
10. *Cost:* A$0.
11. *Acquisition:* Google Maps and hipages.
12. *Main failure risk:* fencers quote from memory.
13. *Confidence:* low.

**7. AML/CTF Tranche 2 customer-checks helper — 51 (kill)**
1. *Customer:* sole-practitioner accountants, conveyancers and real estate agents.
2. *Problem:* new anti-money-laundering obligations from 1 Jul 2026: enrol, run a program, check customers, keep records for 7 years.
3. *Current workaround:* AUSTRAC's free starter kits, consultants, identity-check vendors.
4. *Evidence:* [FACT] ~90,000–100,000 new reporting entities; enrolment deadline 29 Jul 2026.
5. *Competitors:* First AML, OneAML, EasyAML, Persona, Zyphe, Truth Technologies, AUSAML.
6. *What customers pay now:* unverified for small firms.
7. *Our solution:* not pursued.
8. *Price:* n/a.
9. *Time to first usable version:* weeks. Identity checks need paid data sources.
10. *Cost:* high.
11. *Acquisition:* registers and LinkedIn.
12. *Main failure risk:* liability, funded incumbents, free starter kits.
13. *Confidence:* high that it's real, high that it's not for us.

**8. SCHADS sleepover / pay-point self-audit — 50**
1. *Customer:* NDIS employers with 5–50 staff.
2. *Problem:* the sleepover rule changed from 1 Jun 2026, and staff not moved up pay points; the Fair Work Ombudsman is running an inquiry.
3. *Current workaround:* Fair Work Ombudsman calculators, payroll software, consultants.
4. *Evidence:*
   - [FACT] Sleepover variation.
   - [FACT] Enforceable undertakings: Yooralla A$2.05m, Sunnyfield ~A$5.4m.
5. *Competitors:* Pay Cat, ShiftCare (A$9–25 per user), FairWork Mate (A$29.99).
6. *What customers pay now:* no audit-specific spend verified.
7. *Our solution:* upload a roster CSV and get three rule flags.
8. *Price:* A$149–299 for an audit.
9. *Time to first usable version:* 4–7 days.
10. *Cost:* A$0–30.
11. *Acquisition:* the NDIS Provider Register.
12. *Main failure risk:* liability, and employers won't upload payroll data to a stranger.
13. *Confidence:* low.

**9. NDIS invoice sheet (Etsy) — 50**
1. *Customer:* sole-trader support workers.
2. *Problem:* time-of-day rates and the 2026–27 schedule changes: 106 new items, 41 removed.
3. *Current workaround:* free templates.
4. *Evidence:* [SPEND] Etsy listings at A$3–40; no sales counts found.
5. *Competitors:* 10+ apps and free templates.
6. *What customers pay now:* A$3–40.
7. *Our solution:* a Google Sheet with item lookup.
8. *Price:* A$19.
9. *Time to first usable version:* 2–3 days.
10. *Cost:* Etsy fees.
11. *Acquisition:* Etsy search.
12. *Main failure risk:* free alternatives, and the price tables need updating every year.
13. *Confidence:* low.

**10. AU BAS workbook (Etsy) — 50**
1. *Customer:* GST-registered sole traders without accounting software.
2. *Problem:* working out G1, 1A and 1B each quarter.
3. *Current workaround:* spreadsheets.
4. *Evidence:* [SPEND] US$2.56–A$47 listings. [FACT] Sales go to a handful of top Etsy shops.
5. *Competitors:* 6+ sellers.
6. *What customers pay now:* A$14.95–29.99.
7. *Our solution:* a workbook.
8. *Price:* A$19.
9. *Time to first usable version:* 1–2 days.
10. *Cost:* ~A$1.
11. *Acquisition:* Etsy search.
12. *Main failure risk:* no way to stand out.
13. *Confidence:* low.

**11. TLS certificate-renewal runbook for small IT providers (unverified) — 50**
1. *Customer:* small IT providers (MSPs) managing devices that can't renew certificates automatically.
2. *Problem:* certificate lifetimes shrink to 200 days (Mar 2026), 100 days (Mar 2027) and 47 days (Mar 2029). [R-H, unverified]
3. *Current workaround:* spreadsheets, free monitors.
4. *Evidence:* none verified this session.
5. *Competitors:* Uptime Kuma, KeyChest, enterprise certificate-management tools.
6. *What customers pay now:* unverified.
7. *Our solution:* a runbook generator.
8. *Price:* US$29/mo.
9. *Time to first usable version:* 5–7 days.
10. *Cost:* A$15–40/mo.
11. *Acquisition:* r/msp and cold email.
12. *Main failure risk:* certificate monitoring is a commodity.
13. *Confidence:* low (unverified).

**12. Xero repeating-invoice bulk price rise — 49**
1. *Customer:* service businesses with many repeating invoices.
2. *Problem:* price rises have to be applied to each invoice by hand (one user cites 600).
3. *Current workaround:* manual edits.
4. *Evidence:* [COMPLAINT] Xero Product Ideas threads. [SPEND] a $29/mo tool advertised in the thread.
5. *Competitors:* that tool, plus a UK uplift tool on the way.
6. *What customers pay now:* $29/mo (vendor claim).
7. *Our solution:* a grid with rules and a dry run before applying.
8. *Price:* A$49 per run.
9. *Time to first usable version:* 4–7 days. Unverified whether the Xero API allows it.
10. *Cost:* Xero API A$35/mo beyond 5 connected organisations.
11. *Acquisition:* the Xero idea threads.
12. *Main failure risk:* used about once a year, and businesses must trust us with write access to their books.
13. *Confidence:* low-medium.

**13. Security of Payment payment-schedule deadline alerts — 49**
1. *Customer:* builders with 1–20 staff.
2. *Problem:* a missed payment-schedule deadline can make them liable for the full amount claimed. VIC reforms took effect 15 Apr 2026.
3. *Current workaround:* an admin notices, or a lawyer after the fact.
4. *Evidence:* [FACT] statutory timeframes. [SPEND] adjudication costs A$1,100–3,410.
5. *Competitors:* Plexa's free calculators, law firms.
6. *What customers pay now:* lawyers.
7. *Our solution:* email intake, deadline calculation and SMS reminders.
8. *Price:* A$29/mo.
9. *Time to first usable version:* 5–7 days.
10. *Cost:* A$10–40/mo.
11. *Acquisition:* the QBCC register, bookkeepers.
12. *Main failure risk:* claims are rare for small builders, and a wrong deadline is a liability.
13. *Confidence:* low.

**14. AI SWMS generator — 49 (kill)**
1. *Customer:* subbies doing high-risk construction work.
2. *Problem:* principal contractors require a site-specific Safe Work Method Statement (SWMS).
3. *Current workaround:* templates.
4. *Evidence:* [FACT] the legal duty. [SPEND] US$9.99–449.
5. *Competitors:* 15+, including free ones.
6. *What customers pay now:* US$10–79 per document.
7. *Our solution:* not pursued.
8. *Price:* ≤A$15.
9. *Time to first usable version:* 2–3 days.
10. *Cost:* A$10–50/mo.
11. *Acquisition:* Bunnings trade desks.
12. *Main failure risk:* saturated. MakeSWMS took $41 in 30 days.
13. *Confidence:* high that this is a kill.

**15. Small-job building contracts + variations — 49**
1. *Customer:* QLD and NSW sole traders on jobs of A$3.3k–20k.
2. *Problem:* written contracts are mandatory, and poorly recorded variations cause disputes.
3. *Current workaround:* HIA/MBA contract packs (A$58–111), free QBCC templates.
4. *Evidence:* [FACT] thresholds; QBCC names variations as a leading cause of disputes.
5. *Competitors:* HIA, VaryOrder, Small Builders.
6. *What customers pay now:* A$29–111 per contract.
7. *Our solution:* a contract and variation tool that adjusts to state thresholds.
8. *Price:* A$9 per contract.
9. *Time to first usable version:* 7–10 days, plus a legal review.
10. *Cost:* A$10–20/mo.
11. *Acquisition:* the QBCC register.
12. *Main failure risk:* weak enforcement keeps the pain hidden; it brushes against legal practice.
13. *Confidence:* low.

**16. APS selection-criteria checker — 49 (kill)**
1. *Customer:* APS 4–EL1 job applicants.
2. *Problem:* writing a pitch or selection-criteria responses to the word limit, for the right level.
3. *Current workaround:* LLMs, professional writers.
4. *Evidence:* [SPEND] writers charge A$60–400. [FACT] APSC guidance (Apr 2026) asks candidates to disclose AI use.
5. *Competitors:* free LLMs, Fiverr.
6. *What customers pay now:* A$30–400 to humans.
7. *Our solution:* a checker, not a writer.
8. *Price:* A$15.
9. *Time to first usable version:* 3–5 days.
10. *Cost:* LLM API costs.
11. *Acquisition:* LinkedIn.
12. *Main failure risk:* free LLMs, and the AI disclosure rules make "AI-written" a liability.
13. *Confidence:* high that this is a kill.

---

## 4. Red team: top three

### #1 Partner-visa evidence pack builder

| Question | Honest answer |
|---|---|
| Why pay instead of ChatGPT, a spreadsheet or a free tool? | ChatGPT can't compress, merge, split, convert HEIC or produce a set of PDFs within the limits. Free compressors handle **one file at a time and upload intimate documents to a server**. Building the full pack by hand takes hours of fiddling. The paid tool turns a stressful afternoon into minutes and never sees the files. |
| Painful enough to buy today? | Yes, in the 2–8 weeks before lodging. It's an A$11,710 application, uploads can't be undone, and the limits are strict. The A$29 price is 0.25% of the visa charge. |
| Can we reach 20 prospects without ads? | Yes, plausibly. There are active help threads on r/AusVisa, ExpatForum, Poms in Oz and Whirlpool, plus DIY blog comment sections. **Unverified: whether self-promotion is allowed**, so replies must be genuinely useful and disclose who we are. |
| Do customers already spend money or time on this? | Yes. Agents (A$1,800–10,000), templates (A$10–30), VisaBinder's A$99 price, and blogs describing hours of organising. |
| Easy to copy? | Yes. The moat is execution quality, trust and distribution, not technology. |
| Is getting customers harder than building? | **Yes.** That's the main risk, and the reason the experiment below is channel-first. |
| Needs expensive AI, paid data or integrations? | No. Everything runs in the browser using open-source libraries (pdf-lib, pdf.js, fflate). |
| Can it be a one-off purchase? | Yes, and it should be. Each couple has one application. |
| Would a service earn sooner? | A done-for-you packing service means handling strangers' intimate documents and gets closer to giving "immigration assistance". Software that only does clerical work is safer. |
| Cheapest experiment that could disprove it | Ship the free fixer plus a paid pack at A$29, reply to 20 qualified threads, and wait 14 days. Fewer than 100 qualified visitors means the channel failed. 100+ visitors and 0 purchases means the offer or trust failed. |
| Legal | Migration Act s276(3)(a) exempts "merely doing clerical work". The tool must not suggest what evidence to include, score whether it's enough, or draft statements. It only quotes official Home Affairs material. **Get an independent legal check before scaling.** |

**Competitor weaknesses I'm targeting:** VisaBinder costs A$99 and stores files on its servers. Tern only compresses.
VisaPacks' free tier allows 3 compressions. Templates still leave the user doing all the work. **This is a real difference, not just
a nicer interface:** couples are being asked to hand bank statements, passports and private photos to a startup's
server. "Your files never leave your device" can be checked: turn on airplane mode and it still works.

### #2 AU bank-statement converter: killed on differentiation
- Willingness to pay is the strongest of any candidate. But **StatementSheet already ships the exact product I'd have built**
  (runs in the browser, reconciles to the cent, US$19 per batch, open source). A **free** offline converter exists, and two
  Australia-focused converters already exist.
- Getting customers is an SEO fight against established sites. I also **can't test parsers against real AU bank PDFs** in this
  environment, and a converter that silently fails on real statements destroys trust.
- *Revisit if:* the founder's own statements show that AU layouts break the incumbents.

### #3 Test & tag register: parked
- It's the most reachable B2B list (Google Maps), and an incumbent app is rated 1.0 for data loss. But testers export
  directly into vendor software, so retyping results is a deal-breaker for serious operators. It also needs a backend
  for sync and reminders, and no operator complaints in their own words were found.
- *Revisit if:* 5 of 10 operators called say they record results by hand.

---

## 5. Investment committee decision

**Recommend: LodgeReady (working name): a partner-visa evidence pack builder that runs entirely on the user's device.**

**Why it beats the others:** of all 24 candidates, it combines (a) the most acute, high-stakes, time-bound pain, (b) a
price that's an impulse buy next to what's at stake, (c) buyers who gather in identifiable help forums, (d) a difference
buyers care about (privacy, at a third of the leading competitor's price), and (e) the lowest build and running risk
(generic file operations that can be tested here, no server storage, A$0/month).

**Trade-offs accepted:**
- It's a one-off purchase, so there's no recurring revenue. Growth relies on volume through search and community.
- The field is crowded.
- Willingness to pay for *this exact tool* has not been verified.
- I chose it over the converter even though the converter's willingness-to-pay evidence is stronger, because the converter
  can't be differentiated or tested here.

| Item | Definition |
|---|---|
| Initial target customer | DIY couples lodging an AU partner visa (820/801, 309/100, 300) within the next 8 weeks, with 30+ evidence files and no migration agent |
| Single most painful use case | "We have 200 messy files and ImmiAccount takes 5MB per file, a limited number of attachments, no HEIC, and no undo" |
| Smallest useful product | Add files → sort by evidence type → build date-ordered PDFs under 5MB plus an index → download. A free single-file fixer as the hook |
| Offer and price | Build and preview free. **A$29 one-off** to download the full pack (launch price, list A$39), with a 30-day no-questions refund |
| Primary channel | Helpful, disclosed replies in partner-visa help threads and comment sections, with the free fixer as the hook |
| First 20 prospects | Recent (last 30 days) unanswered or partly answered posts asking about evidence organisation, file size, attachment limits or HEIC on r/AusVisa, ExpatForum Australia, Poms in Oz, Whirlpool's immigration forum, and DIY blog comments. Qualification criteria are in `docs/launch/` |
| Minimum evidence before building more | **3 paid packs from 3 different couples within 14 days** of the first post, or 1 paid pack plus 5 qualified "I'd use this" with specific feature requests |
| Biggest unresolved risk | Distribution: communities may remove promotional replies, and SEO takes months |
| Fallback if nobody buys | (1) Diagnose: under 100 visitors = channel; visitors but no builds = trust/UX; builds but no checkout = price/value. (2) Change one variable at a time. (3) If still zero after 30 days, switch to cash: the Airtasker data-entry service (#3) |

## 6. Cheapest validation experiment
A real product with a real price beats a waitlist. Building is cheap, so the MVP itself is the test.

1. Launch the free fixer and the paid pack builder on free hosting.
2. Reply to 20 qualified threads, with value first and disclosure.
3. Measure visitors → builds started → packs built → checkouts started → purchases.

**Stopping rule:** 14 days from the first public post. Assets are in [`../launch/`](../launch/).

## 7. First-day execution plan (for the founder, after approving deployment)
1. Create a Stripe account (free; ABN optional for sole traders) and copy the live keys into the host's environment variables.
2. Deploy to Netlify's free plan, which allows commercial use. The repo is ready (`docs/launch/DEPLOY.md`).
3. Test the full purchase flow once, live, with your own card, then refund yourself. **This does not count as revenue.**
4. Post the first 5 helpful replies (templates in `docs/launch/outreach.md`) and log each in `docs/launch/tracker.csv`.
5. Check the dashboard at the end of the day.

## 8. Expected costs and uncertainties
- **Costs:** A$0 hosting (Netlify free); A$0 domain (use the free netlify.app subdomain at first; a .com.au is ~A$15–25/yr and
  optional); Stripe 1.65% + A$0.30 per domestic card (~A$0.78 on A$29), and 3.5% + A$0.30 on international cards until Apr 2027.
- **Tax:** no GST until turnover reaches A$75k. Sales to overseas consumers could technically create foreign VAT duties.
  Switch to a merchant of record (Polar, ~4–5% + US$0.40–0.50, pays out to AU) if overseas sales become material.
- **Uncertainties:**
  - The official attachment limit (60 vs 100).
  - Community promotion rules.
  - Whether the free fixer attracts traffic.
  - Whether people will pay A$29 when free compressors exist.
  - Legal reading of the clerical-work exemption.

## 9. Decision required from you
1. **Approve public deployment** (Netlify free plan) and a **Stripe account** in your name. Nothing is published or charged until you do.
2. **Approve posting** in the communities listed. Posts go out under your account; I've drafted them but won't send anything.
3. *(Optional, recommended before scaling past ~20 sales)* A one-off legal check of the clerical-work positioning (~A$220–500).
   This exceeds the A$0 path, so it's your call.
