import type { Metadata } from "next";
import { ContactLine, LegalPage, operator } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="22 October 2026">
      <p>
        LodgeReady is run by {operator.name}
        {operator.abn ? ` (ABN ${operator.abn})` : ""}. This policy explains what we handle and, more importantly, what we
        don’t. We aim to follow the Australian Privacy Principles.
      </p>

      <h2>Your documents never leave your device</h2>
      <p>
        Every file you add to LodgeReady is processed inside your own browser. <strong>Your documents are never uploaded to
        us or to anyone else.</strong> We don’t receive, store or share them. The site’s security policy only lets the page
        connect to our own website and, if usage statistics are switched on, to our statistics service, which never receives
        file names, titles, dates or contents.
      </p>
      <p>
        So you can come back later, your files, titles, dates and settings are saved in your browser’s storage (IndexedDB)
        on your device. They stay there until you use “Clear everything” in the builder or clear your browser data, though
        some browsers clear saved site data on their own (Safari can after 7 days without a visit). An unlock token and your
        unlock link are kept in your browser’s local storage after you pay. On a shared computer, use “Clear everything”
        when you’re done.
      </p>

      <h2>Payments</h2>
      <p>
        If you buy an unlock, payment is handled by Stripe. Stripe collects your card details. We never see or store
        them. We receive the information Stripe provides about the purchase, such as your name, email address, the
        amount and the payment status. We use it to provide and support your purchase, issue refunds and meet our tax and
        record-keeping obligations. To switch on your unlock, the page sends our server only the checkout reference Stripe
        gives it, and our server asks Stripe whether that payment went through. Stripe’s privacy policy is at{" "}
        <a className="text-accent underline underline-offset-2" href="https://stripe.com/au/privacy" target="_blank" rel="noopener noreferrer">
          stripe.com/au/privacy
        </a>
        .
      </p>

      <h2>Usage statistics</h2>
      <p>
        If usage statistics are switched on, we record a small number of anonymous events to understand whether LodgeReady
        is working: “home page viewed”, “builder opened”, “step viewed”, “files added”, “dates confirmed”, “build started”,
        “build cancelled”, “pack built”, “build failed”, “over the attachment limit”, “preview opened”, “unlock shown”,
        “checkout started”, “checkout unavailable”, “purchase confirmed”, “download clicked”, “unlock link saved”,
        “opened in an app’s built-in browser”, “browser storage full” and “fixer used”. Each event can include only these
        details:
      </p>
      <ul>
        <li>the page address, without anything after the “?”;</li>
        <li>rough counts in ranges, such as “11–50 files” or “11–50 seconds”;</li>
        <li>the kind of file, step or download (for example “PDF”, “sort” or “zip”), the app whose browser you’re in, and whether something worked;</li>
        <li>whether this browser has unlocked LodgeReady;</li>
        <li>the short code on the link you followed to get here, if any (for example “?ref=forum”);</li>
        <li>a random identifier that lasts only for your browser tab session, and the time.</li>
      </ul>
      <p>
        We <strong>never</strong> send file names, titles, dates, contents or anything you type. There are no cookies and no
        advertising trackers. Statistics are processed by PostHog. As with any web request, PostHog receives your IP address
        and browser type when an event is sent; our statistics project is set to discard IP addresses rather than store
        them.
      </p>

      <h2>Hosting</h2>
      <p>
        Our hosting provider (Netlify) keeps standard technical logs, such as IP address, browser type and the pages
        requested, for security and reliability. These logs never contain your documents.
      </p>

      <h2>Overseas disclosure</h2>
      <p>
        Stripe, Netlify and PostHog may store the limited information described above outside Australia, including in the
        United States.
      </p>

      <h2>Access, correction and complaints</h2>
      <p>
        You can ask to access or correct the personal information we hold about you (in practice, your purchase record), or
        make a privacy complaint, by contacting <ContactLine />. We’ll respond within 30 days. If you’re not satisfied, you
        can contact the Office of the Australian Information Commissioner at{" "}
        <a className="text-accent underline underline-offset-2" href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">
          oaic.gov.au
        </a>
        .
      </p>
    </LegalPage>
  );
}
