import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { UnlockClient } from "@/components/UnlockClient";

export const metadata: Metadata = {
  title: "Unlocking",
  robots: { index: false, follow: false },
};

export default function UnlockPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-grouped">
      <header className="border-b border-separator/70 bg-bg">
        <div className="mx-auto flex h-14 max-w-xl items-center px-4">
          <Logo />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <Suspense fallback={<p className="py-10 text-center text-label-2">Confirming your payment…</p>}>
          <UnlockClient />
        </Suspense>
      </main>
    </div>
  );
}
