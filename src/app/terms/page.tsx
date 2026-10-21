import type { Metadata } from "next";
import { ContactLine, LegalPage, operator } from "@/components/LegalPage";
import { FREE_ITEM_LIMIT, PRICE_LABEL } from "@/lib/pack/limits";

export const metadata: Metadata = { title: "Terms and refunds" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms and refunds" updated="21 October 2026">
      <p>
        These terms apply when you use LodgeReady, which is run by {operator.name}
        {operator.abn ? ` (ABN ${operator.abn})` : ""}. By using it, you agree to them.
      </p>

      <h2>What LodgeReady does, and doesn’t do</h2>
      <p>
        LodgeReady is a document tool. It organises, converts, compresses and combines the files <strong>you</strong> choose,
        and adds contents pages and an index from the titles and dates <strong>you</strong> enter.
      </p>
      <ul>
        <li>It does not provide immigration advice or immigration assistance, and is not a migration agent.</li>
        <li>It does not tell you what evidence to provide, or assess whether your evidence is enough.</li>
        <li>It is not affiliated with, or endorsed by, the Department of Home Affairs.</li>
      </ul>
      <p>
        You are responsible for what you include in your application. Check every file before you upload it, and check the
        current requirements and limits shown on the Home Affairs website and in ImmiAccount. For advice about your
        situation, speak with a registered migration agent or a lawyer.
      </p>

      <h2>Free use and the unlock</h2>
      <p>
        You can use the single-file fixer and build packs of up to {FREE_ITEM_LIMIT} files for free. A one-off payment of{" "}
        {PRICE_LABEL} (including any GST that applies) unlocks unlimited packs and rebuilds for your personal use, in the
        browser where you paid. Your unlock link can be used to switch it on in your other browsers. Please don’t share it
        publicly.
      </p>

      <h2>Refunds</h2>
      <p>
        If LodgeReady doesn’t work for you, contact <ContactLine /> within 30 days of buying and we’ll refund you in full, no
        questions asked. Our goods and services come with guarantees that cannot be excluded under the Australian Consumer
        Law, and nothing in these terms limits those rights.
      </p>

      <h2>Your files and our responsibility</h2>
      <p>
        Files are processed and stored on your device, so keep your own copies of your original documents. To the extent
        the law allows, and apart from the consumer guarantees above, we aren’t liable for indirect or consequential loss,
        or for the outcome of any visa application.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms from time to time. The version on this page applies to your use of LodgeReady from the date
        shown above. These terms are governed by the laws of Australia.
      </p>
    </LegalPage>
  );
}
