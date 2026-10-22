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
  Plane,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { ATTACH_HELP_URL, FREE_ITEM_LIMIT, PRICE_LABEL } from "@/lib/pack/limits";

const NB = " ";
const analyticsOn = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
const connectsTo = analyticsOn ? "this site and our anonymous statistics service" : "this site";

/** Sizes follow what the builder produces at its default photo size (about 10 to 15 photos per file). */
const examplePack = [
  { name: "00_Evidence_index.pdf", size: "52 KB", note: "Lists every document in the pack" },
  { name: "01_Financial_evidence_part1of2.pdf", size: `4.4${NB}MB`, note: "41 documents, contents page first" },
  { name: "02_Financial_evidence_part2of2.pdf", size: `3.1${NB}MB`, note: "29 documents" },
  { name: "03_Household_evidence.pdf", size: `2.7${NB}MB`, note: "18 documents" },
  { name: "04_Social_evidence_part1of3.pdf", size: `4.5${NB}MB`, note: "12 photos with captions" },
  { name: "05_Social_evidence_part2of3.pdf", size: `4.4${NB}MB`, note: "11 photos with captions" },
  { name: "06_Social_evidence_part3of3.pdf", size: `1.9${NB}MB`, note: "5 photos with captions" },
  { name: "07_Identity_Passport.pdf", size: "640 KB", note: "Kept as its own file" },
];

const limits = [
  { icon: Scale, title: `5${NB}MB per file`, body: "Anything bigger is rejected. Phone photos and scans add up fast." },
  {
    icon: Layers,
    title: "Limited attachments",
    body: "Each applicant can attach only so many files, and the limit depends on the application type.",
  },
  { icon: Ban, title: "No undo", body: "Attachments can’t be removed once they’re added, so a messy upload stays messy." },
  {
    icon: Images,
    title: "Picky about formats",
    body: "Encrypted PDFs, like many “secured” bank statements, can’t be accepted. Nor can iPhone HEIC photos.",
  },
];

const steps = [
  {
    icon: FolderOpen,
    title: "Add everything",
    body: "Drop in statements, leases, bills, photos, screenshots and forms. iPhone HEIC photos and locked bank PDFs are fine.",
  },
  {
    icon: ListOrdered,
    title: "Choose the groups",
    body: "Files are bunched by type (bank statements, bills, photos, messages), so you can put each type in a group in one tap. You decide what goes where.",
  },
  {
    icon: FileStack,
    title: "Download your pack",
    body: `Numbered PDFs in upload order, each with a contents page, documents in date order and every file under 5${NB}MB.`,
  },
];

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is this immigration advice?",
    a: (
      <>
        No. LodgeReady only organises, converts and compresses the files you choose. It doesn’t tell you what evidence to
        provide or judge whether it’s enough, and it isn’t affiliated with the Department of Home Affairs. For advice, speak
        with a registered migration agent or a lawyer.
      </>
    ),
  },
  {
    q: "Do you see my documents?",
    a: (
      <>
        No. Your files are processed inside your browser and saved only on this device, so you can come back later. They are
        never uploaded, and never sent to us. The page can only connect to {connectsTo}, and statistics never include file
        names or contents. You can check: once the builder has loaded, turn on Airplane mode. It keeps working.
      </>
    ),
  },
  {
    q: "What files can I add?",
    a: (
      <>
        PDFs, photos and screenshots (JPG, PNG, HEIC/HEIF, WEBP, GIF, BMP). Long screenshots are cut into readable pages.
        Word, Excel, PowerPoint, RTF and text files are kept as their own uploads, exactly as they are, including any comments
        or tracked changes, so check them first.
      </>
    ),
  },
  {
    q: "What does the finished pack look like?",
    a: (
      <>
        Numbered files in upload order, such as 01_Financial_evidence.pdf: an evidence index, then one PDF per group, each
        opening with a contents page that lists every document with its page numbers. Large groups are split into parts so
        every file stays under 5&nbsp;MB. Identity documents and forms stay as separate files.
      </>
    ),
  },
  {
    q: "Where do the dates come from?",
    a: (
      <>
        LodgeReady suggests dates from photo data and file names and uses them to put documents in order. Suggestions can be
        wrong (a photo sent by message often carries the day it was saved), so a date is only printed on your PDFs once
        you’ve checked it.
      </>
    ),
  },
  {
    q: "How many attachments am I allowed?",
    a: (
      <>
        Home Affairs’ help says there’s a limit for each applicant, and that it depends on the application type. Figures
        quoted online differ, so check yours in ImmiAccount before you upload (
        <a className="text-accent underline underline-offset-2" href={ATTACH_HELP_URL} target="_blank" rel="noreferrer">
          Home Affairs: attach documents
        </a>
        ). Once a pack has more than 30 attachments, LodgeReady asks for your limit and warns you if the pack needs more.
        Photo-heavy packs use more attachments; “Smaller photos” fits about twice as many in each.
      </>
    ),
  },
  {
    q: "My bank statements are “secured”. Will they work?",
    a: (
      <>
        Usually, yes. Many banks lock their PDFs against editing, and encrypted PDFs can’t be accepted. LodgeReady re-renders
        these as clean, unlocked copies that look the same, though text on re-rendered pages can’t be selected. PDFs that
        need a password to open must be unlocked first.
      </>
    ),
  },
  {
    q: "Can I add more evidence later?",
    a: (
      <>
        Yes, without uploading anything twice (attachments can’t be removed). After you upload a pack, mark it as uploaded:
        its files are left out of your next pack, and the numbering carries on from your last file.
      </>
    ),
  },
  {
    q: "Will my files stay saved?",
    a: (
      <>
        Usually, until you clear them. Some browsers clear saved site data on their own: Safari can after 7 days without a
        visit, and private windows forget everything when closed. Keep your original files, and your unlock link if you buy
        one.
      </>
    ),
  },
  {
    q: "Does it work on my phone?",
    a: <>Yes, including photos straight from your iPhone. Keep the screen on while it builds. For very large packs, a computer is faster.</>,
  },
  {
    q: "Can I get a refund?",
    a: (
      <>
        Yes. Changed your mind? Email us within 30 days of buying for a full refund, for any reason. This is on top of your
        rights under the Australian Consumer Law.
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
              Your partner visa evidence, sized and sorted for ImmiAccount.
            </h1>
            <p className="mt-5 max-w-xl text-[1.1875rem] leading-relaxed text-label-2">
              Turn hundreds of photos, statements and screenshots into a tidy set of date-ordered PDFs, with every file under
              5&nbsp;MB, a contents page on each merged PDF and an index to match. All in your browser.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/build" size="lg">
                Try it free
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
                <Check className="size-4 text-success" aria-hidden="true" /> Free up to {FREE_ITEM_LIMIT} documents, then {PRICE_LABEL} once
              </li>
            </ul>
          </div>

          <figure aria-label="Example of a finished pack" className="rounded-[var(--radius-card)] bg-surface p-2 shadow-float ring-1 ring-separator/60">
            <div className="flex items-center justify-between rounded-t-2xl px-4 pb-2 pt-3">
              <span className="text-[0.8125rem] font-semibold uppercase tracking-wide text-label-3">Example pack</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-0.5 text-[0.8125rem] font-medium text-success">
                <Check className="size-3.5" aria-hidden="true" /> All under 5&nbsp;MB
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
            <figcaption className="px-4 pb-3 pt-2 text-[0.75rem] text-label-3">
              Illustration: 70 downloaded (unlocked) statements, 18 household documents and 28 photos. Locked statements are
              re-rendered and take several times more space. Your pack depends on your files.
            </figcaption>
          </figure>
        </section>

        {/* The problem */}
        <section aria-labelledby="limits-title" className="bg-grouped py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="limits-title" className="max-w-2xl text-[1.875rem] font-semibold leading-tight sm:text-[2.25rem]">
              ImmiAccount is strict. One messy upload can’t be taken back.
            </h2>
            <p className="mt-4 max-w-2xl text-[1.0625rem] text-label-2">
              These are the published technical limits. LodgeReady takes care of the files, so you can focus on your evidence.
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
              Three steps, all in your browser.
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
                Dates are suggested from photo data and file names. Only the dates you check are printed.
              </p>
              <p className="flex gap-2">
                <Lock className="mt-0.5 size-5 shrink-0 text-label-3" aria-hidden="true" />
                Locked bank PDFs are re-rendered into clean, unlocked copies that look the same.
              </p>
              <p className="flex gap-2">
                <Images className="mt-0.5 size-5 shrink-0 text-label-3" aria-hidden="true" />
                Give a photo a title and it’s printed above the photo and in the contents.
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
                everything inside your browser. Your files are never uploaded, and never sent to us.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-3">
              {[
                { icon: ShieldCheck, text: "Processed on your device. Your files are never uploaded." },
                { icon: Plane, text: "Check it: once the builder has loaded, turn on Airplane mode. It keeps working." },
                { icon: Lock, text: `The page can only connect to ${connectsTo}.` },
                { icon: FolderOpen, text: "Saved only in this browser, so you can come back. Clear it any time." },
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
              Try everything for free. Pay once if your pack is made from more than {FREE_ITEM_LIMIT} documents.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-separator p-7">
                <h3 className="text-[1.25rem] font-semibold">Free</h3>
                <p className="mt-1 text-[2.25rem] font-semibold tracking-tight">A$0</p>
                <ul className="mt-5 grid grid-cols-1 gap-2.5 text-[0.9375rem]">
                  {[
                    "Fix single files, unlimited",
                    `Download packs made from up to ${FREE_ITEM_LIMIT} documents`,
                    "Build and preview a pack of any size",
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
                    "Full refund within 30 days if you change your mind",
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
                  <p className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-label-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-[1.875rem] font-semibold sm:text-[2.25rem]">Upload with fewer surprises.</h2>
            <p className="mx-auto mt-3 max-w-xl text-label-2">
              Start with your messiest folder. You can build and preview the whole pack before you pay a cent.
            </p>
            <ButtonLink href="/build" size="lg" className="mt-8">
              Try it free
              <ArrowRight className="size-5" aria-hidden="true" />
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
