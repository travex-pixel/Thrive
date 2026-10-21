import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export const operator = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME || "the operator of LodgeReady",
  abn: process.env.NEXT_PUBLIC_OPERATOR_ABN || null,
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null,
};

export function ContactLine() {
  return operator.email ? (
    <a className="text-accent underline underline-offset-2" href={`mailto:${operator.email}`}>
      {operator.email}
    </a>
  ) : (
    <>the email address on your Stripe receipt</>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-10 sm:px-6">
        <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.5rem]">{title}</h1>
        <p className="mt-2 text-[0.9375rem] text-label-3">Last updated {updated}</p>
        <div className="mt-8 grid grid-cols-1 gap-5 leading-relaxed text-label-2 [&_h2]:mt-4 [&_h2]:text-[1.25rem] [&_h2]:font-semibold [&_h2]:text-label [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-label">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
