import {
  ArrowRight,
  Ban,
  CalendarDays,
  Check,
  FileStack,
  FileText,
  FolderOpen,
  Images,
  Layers,
  ListOrdered,
  Lock,
  Scale,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { FREE_ITEM_LIMIT, PRICE_LABEL } from "@/lib/pack/limits";

const examplePack = [
  { name: "00 Evidence index.pdf", size: "52 KB", note: "Contents of every file" },
  { name: "01 Financial evidence (part 1 of 2).pdf", size: "4.4 MB", note: "41 documents · Jan 2023 – Feb 2025" },
  { name: "02 Financial evidence (part 2 of 2).pdf", size: "3.1 MB", note: "29 documents · Mar 2025 – Sep 2026" },
  { name: "03 Household evidence.pdf", size: "2.7 MB", note: "18 documents · Lease, bills, mail" },
  { name: "04 Social evidence.pdf", size: "4.6 MB", note: "64 photos with captions" },
  { name: "05 Commitment evidence.pdf", size: "1.9 MB", note: "Travel, messages, plans" },
  { name: "06 Identity - Passport.pdf", size: "640 KB", note: "Kept separate" },
];

const limits = [
  { icon: Scale, title: "5 MB per file", body: "Anything bigger is rejected. Phone photos and scans add up fast." },
  { icon: Layers, title: "Limited attachments", body: "Each applicant can only attach so many files, so evidence needs combining." },
  { icon: Ban, title: "No undo", body: "Once your application is submitted, attachments can’t be deleted." },
  { icon: Images, title: "Picky about formats", body: "iPhone HEIC photos and WEBP images aren’t on the accepted list." },
];

const steps = [
  {
    icon: FolderOpen,
    title: "Add everything",
    body: "Drop in statements, leases, bills, photos, screenshots and forms. iPhone HEIC photos and locked bank PDFs are fine.",
  },
  {
    icon: ListOrdered,
    title: "Sort into groups",
    body: "Financial, Household, Social and Commitment, plus Identity and Forms kept as separate files. Dates are picked up for you.",
  },
  {
    icon: FileStack,
    title: "Download your pack",
    body: "Numbered PDFs in upload order, each with a contents page, documents in date order and every file under 5 MB.",
  },
];

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is this immigration advice?",
    a: (
      <>
        No. LodgeReady only organises, converts and compresses the files you choose. It doesn’t tell you what evidence to
        provide or judge whether it’s enough. For advice, speak with a registered migration agent or a lawyer.
      </>
    ),
  },
  {
    q: "Do you see my documents?",
    a: (
      <>
        No. Your files are processed inside your browser and saved only on this device, so you can come back later. They are
        never uploaded to us, and the site’s security policy blocks the page from sending them anywhere. You can check by
        turning off your Wi-Fi once the builder has loaded. It keeps working.
      </>
    ),
  },
  {
    q: "What files can I add?",
    a: (
      <>
        PDFs, photos and screenshots (JPG, PNG, HEIC/HEIF, WEBP, GIF, BMP). Word, Excel, PowerPoint, RTF and text files
        are kept as their own uploads, because ImmiAccount accepts them as they are.
      </>
    ),
  },
  {
    q: "What does the finished pack look like?",
    a: (
      <>
        Numbered PDFs in upload order: an evidence index, then one PDF per group, each opening with a contents page that
        lists every document with its date and page numbers. Large groups are split into parts so every file stays under
        5 MB. Identity documents and signed forms stay as separate files.
      </>
    ),
  },
  {
    q: "How many attachments am I allowed?",
    a: (
      <>
        Home Affairs says the limit per applicant depends on the application type. Many guides cite 60, or 100 for partner
        applications. Check what your ImmiAccount shows, then set that limit in the builder. It warns you if your pack
        needs more.
      </>
    ),
  },
  {
    q: "My bank statements are “secured”. Will they work?",
    a: (
      <>
        Usually, yes. Many banks lock their PDFs against editing. LodgeReady re-renders these as clean copies that look the
        same, though text on re-rendered pages can’t be selected. PDFs that need a password to open must be unlocked first.
      </>
    ),
  },
  {
    q: "Can I add more evidence later?",
    a: <>Yes. Your files stay saved in this browser until you clear them, so you can add more and rebuild at any time.</>,
  },
  {
    q: "Does it work on my phone?",
    a: <>Yes, including photos straight from your iPhone. For very large packs, a computer is faster.</>,
  },
  {
    q: "What if it doesn’t work for me?",
    a: (
      <>
        Email us within 30 days of buying for a full refund, no questions asked. This doesn’t limit your rights under the
        Australian Consumer Law.
      </>
    ),
  },
];

export default function Home() {
  return (
    <>
      <LandingAnalytics />
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-accent-tint px-3 py-1 text-[0.875rem] font-medium text-accent">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Private by design: files never leave your device
            </p>
            <h1 className="mt-5 text-[2.375rem] font-semibold leading-[1.08] sm:text-[3.25rem]">
              Your partner visa evidence, ready for ImmiAccount.
            </h1>
            <p className="mt-5 max-w-xl text-[1.1875rem] leading-relaxed text-label-2">
              Turn hundreds of photos, statements and screenshots into a tidy set of date-ordered PDFs, with every file under
              5 MB, a contents page on each and an index to match. Built in your browser, in minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/build" size="lg">
                Build my pack, free
                <ArrowRight className="size-5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/fix" size="lg" variant="secondary">
                Fix one file
              </ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem] text-label-3">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden="true" /> No account
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden="true" /> Nothing uploaded
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden="true" /> Free up to {FREE_ITEM_LIMIT} files
              </li>
            </ul>
          </div>

          <figure aria-label="Example of a finished pack" className="rounded-[var(--radius-card)] bg-surface p-2 shadow-float ring-1 ring-separator/60">
            <div className="flex items-center justify-between rounded-t-2xl px-4 pb-2 pt-3">
              <span className="text-[0.8125rem] font-semibold uppercase tracking-wide text-label-3">Example pack</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-0.5 text-[0.8125rem] font-medium text-success">
                <Check className="size-3.5" aria-hidden="true" /> All under 5 MB
              </span>
            </div>
            <ul className="divide-y divide-separator/70">
              {examplePack.map((f) => (
                <li key={f.name} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="size-5 shrink-0 text-accent" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium">{f.name}</p>
                    <p className="truncate text-[0.8125rem] text-label-3">{f.note}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-[0.8125rem] text-label-3">{f.size}</span>
                </li>
              ))}
            </ul>
            <figcaption className="px-4 pb-3 pt-2 text-[0.75rem] text-label-3">Illustration. Your pack depends on your files.</figcaption>
          </figure>
        </section>

        {/* The problem */}
        <section aria-labelledby="limits-title" className="bg-grouped py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="limits-title" className="max-w-2xl text-[1.875rem] font-semibold leading-tight sm:text-[2.25rem]">
              ImmiAccount is strict. One messy upload can’t be taken back.
            </h2>
            <p className="mt-4 max-w-2xl text-[1.0625rem] text-label-2">
              These are the published technical limits. LodgeReady handles them for you, so you can focus on your evidence.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {limits.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-[var(--radius-card)] bg-surface p-6 shadow-card">
                  <Icon className="size-6 text-accent" aria-hidden="true" />
                  <h3 className="mt-4 text-[1.125rem] font-semibold">{title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-label-2">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" aria-labelledby="how-title" className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="how-title" className="text-[1.875rem] font-semibold sm:text-[2.25rem]">
              Three steps. About ten minutes.
            </h2>
            <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="relative rounded-[var(--radius-card)] border border-separator p-6">
                  <span className="text-[0.8125rem] font-semibold text-label-3">Step {i + 1}</span>
                  <Icon className="mt-3 size-7 text-accent" aria-hidden="true" />
                  <h3 className="mt-3 text-[1.25rem] font-semibold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-label-2">{body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid grid-cols-1 gap-4 text-[0.9375rem] text-label-2 sm:grid-cols-3">
              <p className="flex gap-2">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-label-3" aria-hidden="true" />
                Dates are read from photo data and file names, and you can edit any of them.
              </p>
              <p className="flex gap-2">
                <Lock className="mt-0.5 size-5 shrink-0 text-label-3" aria-hidden="true" />
                Locked bank PDFs are re-rendered into clean copies that ImmiAccount accepts.
              </p>
              <p className="flex gap-2">
                <Images className="mt-0.5 size-5 shrink-0 text-label-3" aria-hidden="true" />
                Photos get a caption with their title and date, so every page explains itself.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" aria-labelledby="privacy-title" className="bg-grouped py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center">
            <div>
              <h2 id="privacy-title" className="text-[1.875rem] font-semibold leading-tight sm:text-[2.25rem]">
                Your relationship evidence is private. It stays that way.
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-label-2">
                Bank statements, passports, private photos and messages shouldn’t sit on a startup’s server. LodgeReady does
                everything inside your browser. Your files are never uploaded, and we couldn’t see them if we wanted to.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-3">
              {[
                { icon: ShieldCheck, text: "Processed on your device. Nothing is uploaded, ever." },
                { icon: WifiOff, text: "Prove it: once the builder loads, turn off your Wi-Fi. It keeps working." },
                { icon: Lock, text: "A strict security policy stops the page sending your files anywhere." },
                { icon: FolderOpen, text: "Saved only in this browser, so you can come back. Clear it with one tap." },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-card">
                  <Icon className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-[0.9375rem]">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" aria-labelledby="pricing-title" className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="pricing-title" className="text-center text-[1.875rem] font-semibold sm:text-[2.25rem]">
              Simple, one-off pricing
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-label-2">
              Try everything for free. Pay once when your pack is bigger than {FREE_ITEM_LIMIT} files.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-separator p-7">
                <h3 className="text-[1.25rem] font-semibold">Free</h3>
                <p className="mt-1 text-[2.25rem] font-semibold tracking-tight">A$0</p>
                <ul className="mt-5 grid grid-cols-1 gap-2.5 text-[0.9375rem]">
                  {[
                    "Fix single files, unlimited",
                    `Download packs of up to ${FREE_ITEM_LIMIT} files`,
                    "Preview a pack of any size",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/build" variant="secondary" className="mt-7 w-full">
                  Start free
                </ButtonLink>
              </div>
              <div className="rounded-[var(--radius-card)] bg-surface p-7 shadow-float ring-2 ring-accent">
                <h3 className="text-[1.25rem] font-semibold">Unlimited pack</h3>
                <p className="mt-1 text-[2.25rem] font-semibold tracking-tight">
                  {PRICE_LABEL} <span className="text-[1rem] font-normal text-label-3">one-off</span>
                </p>
                <ul className="mt-5 grid grid-cols-1 gap-2.5 text-[0.9375rem]">
                  {[
                    "Packs of any size",
                    "Rebuild as often as you like",
                    "Contents pages and an evidence index",
                    "HEIC photo and locked-PDF conversion",
                    "30-day money-back guarantee",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/build" className="mt-7 w-full">
                  Build my pack
                </ButtonLink>
                <p className="mt-3 text-center text-[0.8125rem] text-label-3">No subscription. Secure checkout by Stripe.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="bg-grouped py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 id="faq-title" className="text-[1.875rem] font-semibold sm:text-[2.25rem]">
              Questions
            </h2>
            <div className="mt-8 divide-y divide-separator overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card">
              {faqs.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[1.0625rem] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden="true" className="text-[1.25rem] leading-none text-label-3 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-label-2">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-[1.875rem] font-semibold sm:text-[2.25rem]">Lodge with confidence.</h2>
            <p className="mx-auto mt-3 max-w-xl text-label-2">
              Start with your messiest folder. You’ll see the whole pack before you pay a cent.
            </p>
            <ButtonLink href="/build" size="lg" className="mt-8">
              Build my pack, free
              <ArrowRight className="size-5" aria-hidden="true" />
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
