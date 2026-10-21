import type { Metadata } from "next";
import { ContactLine, LegalPage, operator } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="21 October 2026">
      <p>
        LodgeReady is run by {operator.name}
        {operator.abn ? ` (ABN ${operator.abn})` : ""}. This policy explains what we handle and, more importantly, what we
        don’t. We aim to follow the Australian Privacy Principles.
      </p>

      <h2>Your documents never leave your device</h2>
      <p>
        Every file you add to LodgeReady is processed inside your own browser. <strong>Your documents are never uploaded to
        us or to anyone else.</strong> We can’t see, read, store or share them. The site’s Content Security Policy only allows the
        page to talk to our own website (and to an analytics service, if switched on, which receives no file information).
      </p>
      <p>
        So you can come back later, your files, titles, dates and settings are saved in your browser’s storage (IndexedDB)
        on your device. They stay there until you use “Clear everything” in the builder or clear your browser data. An
        unlock token is kept in your browser’s local storage after you pay.
      </p>

      <h2>Payments</h2>
      <p>
        If you buy an unlock, payment is handled by Stripe. Stripe collects your card details. We never see or store
        them. We receive the information Stripe provides about the purchase, such as your name, email address, the
        amount and the payment status. We use it to provide and support your purchase, issue refunds and meet our tax and
        record-keeping obligations. Stripe’s privacy policy is at{" "}
        <a className="text-accent underline underline-offset-2" href="https://stripe.com/au/privacy" target="_blank" rel="noopener noreferrer">
          stripe.com/au/privacy
        </a>
        .
      </p>

      <h2>Usage statistics</h2>
      <p>
        If usage statistics are switched on, we record a small number of anonymous events to understand whether LodgeReady
        is working: for example “builder opened”, “pack built” or “checkout started”. We only send rough counts (such as
        “11–50 files”) and the page address. We <strong>never</strong> send file names, titles, dates, contents or anything
        you type. There are no cookies and no advertising trackers. Events use a random identifier that lasts only for your
        browser tab session. Statistics are processed by PostHog. As with any web request, PostHog receives your IP address
        when an event is sent. We set our analytics project to discard IP addresses rather than store them.
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
