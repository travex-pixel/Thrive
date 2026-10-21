import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { FixApp } from "@/components/fix/FixApp";

export const metadata: Metadata = {
  title: "Make a file ImmiAccount-ready (free)",
  description:
    "Free tool: shrink a PDF or photo to under 5 MB, convert iPhone HEIC photos and unlock “secured” bank PDFs for ImmiAccount. Runs on your device. Nothing is uploaded.",
};

export default function FixPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-10 sm:px-6">
        <p className="text-[0.875rem] font-semibold uppercase tracking-wide text-accent">Free tool</p>
        <h1 className="mt-2 text-[2rem] font-semibold leading-tight sm:text-[2.5rem]">Make a file ImmiAccount-ready</h1>
        <p className="mt-3 text-[1.0625rem] text-label-2">
          File too big, a HEIC photo, or a “secured” PDF that won’t upload? Drop it in and get a version that fits the 5 MB limit,
          in a format ImmiAccount accepts.
        </p>
        <div className="mt-8">
          <FixApp />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
