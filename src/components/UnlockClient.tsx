"use client";

import { CircleCheck, Copy, LoaderCircle, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Controls";
import { track } from "@/lib/analytics";
import { hasLicense, storeLicense } from "@/lib/license-client";

type State =
  | { status: "checking" }
  | { status: "cancelled" }
  | { status: "ok"; link: string; saved: boolean }
  | { status: "error"; message: string; retry: boolean };

/** Some browsers won't let a page close a tab it didn't open itself, so say what to do if it stays open. */
function CloseTab() {
  const [tried, setTried] = useState(false);
  return (
    <div className="grid grid-cols-1 gap-2">
      <Button
        size="lg"
        onClick={() => {
          window.close();
          window.setTimeout(() => setTried(true), 400);
        }}
      >
        Close this tab
      </Button>
      {tried ? <p className="text-[0.875rem] text-label-3">If it’s still open, close it yourself. Your pack is in your other tab.</p> : null}
    </div>
  );
}

/** Plain links on purpose: a full page load gives a freshly started builder that reads the new unlock. */
function BackToPack({ unlocked, secondary }: { unlocked?: boolean; secondary?: boolean }) {
  return (
    <a href={unlocked ? "/build?unlocked=1" : "/build"} className={buttonClasses(secondary ? "secondary" : "primary", "lg")}>
      Back to my pack
    </a>
  );
}

export function UnlockClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  // Checkout normally opens in its own tab, next to the builder; this page then just says "you can close this".
  const inTab = params.get("tab") === "1";
  const restore = params.get("restore") === "1";
  const cancelled = params.get("cancelled") === "1";
  const [state, setState] = useState<State>(cancelled ? { status: "cancelled" } : { status: "checking" });
  const [copied, setCopied] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    if (cancelled) return;
    let cancelledEffect = false;
    const alreadyUnlocked = hasLicense();
    const verify = async () => {
      attempts.current++;
      try {
        const res = await fetch(`/api/verify?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { token?: string; message?: string };
        if (cancelledEffect) return;
        if (res.ok && data.token) {
          const link = `${window.location.origin}/unlock?session_id=${encodeURIComponent(sessionId)}`;
          const saved = storeLicense(data.token, link);
          setState({ status: "ok", link, saved });
          // Count each purchase once: not on reloads of this page, and restores separately.
          if (!alreadyUnlocked) track("purchase_verified", { result: restore ? "restore" : "new" });
          return;
        }
        // Stripe can take a moment to mark a session paid; retry for about half a minute.
        if (res.status === 402 && attempts.current < 12) {
          window.setTimeout(verify, 2500);
          return;
        }
        setState({ status: "error", message: data.message ?? "We couldn’t confirm your payment.", retry: res.status >= 500 || res.status === 402 });
      } catch {
        if (!cancelledEffect) setState({ status: "error", message: "You seem to be offline. Reconnect and try again.", retry: true });
      }
    };
    void verify();
    return () => {
      cancelledEffect = true;
    };
  }, [sessionId, restore, cancelled]);

  if (state.status === "cancelled") {
    return (
      <div className="grid grid-cols-1 gap-4">
        <h1 className="text-[1.75rem] font-semibold leading-tight">Checkout cancelled</h1>
        <p className="text-label-2">You haven’t been charged. Your pack is still in your other LodgeReady tab.</p>
        {/* Opened from the builder: going "back" here would start a second builder, so just close. */}
        <CloseTab />
      </div>
    );
  }

  if (state.status === "checking") {
    return (
      <p className="flex items-center justify-center gap-3 py-10 text-label-2" aria-live="polite">
        <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden="true" /> Confirming your payment with Stripe…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Notice tone="danger" icon={<TriangleAlert className="size-5 text-danger" aria-hidden="true" />}>
          {state.message}
        </Notice>
        <div className="flex flex-col gap-2 sm:flex-row">
          {state.retry ? (
            <Button onClick={() => window.location.reload()} size="lg">
              Try again
            </Button>
          ) : null}
          <BackToPack secondary />
        </div>
        <p className="text-[0.875rem] text-label-3">
          If you were charged and this keeps happening, reply to your Stripe receipt and we’ll sort it out straight away.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-1 size-7 shrink-0 text-success" aria-hidden="true" />
        <div>
          <h1 className="text-[1.75rem] font-semibold leading-tight">You’re unlocked</h1>
          <p className="mt-1 text-label-2">
            {inTab
              ? "Thank you. Go back to your LodgeReady tab: your pack is unlocked there, ready to download."
              : "Thank you. Unlimited packs are now switched on in this browser."}
          </p>
        </div>
      </div>
      {!state.saved ? (
        <Notice tone="warning" icon={<TriangleAlert className="size-5 text-warning" aria-hidden="true" />}>
          This browser isn’t letting LodgeReady save anything (private browsing can do this), so the unlock lasts only while
          your tabs are open. Save the link below to unlock again later.
        </Notice>
      ) : null}
      <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
        <p className="font-semibold">Save your unlock link</p>
        <p className="mt-1 text-[0.9375rem] text-label-2">
          Open it in another browser or on another device, or after clearing your browser, to unlock again. Keep it private.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={state.link}
            aria-label="Your unlock link"
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-control)] border border-separator bg-surface-2 px-3 text-[0.875rem] text-label-2"
          />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Copy className="size-5" aria-hidden="true" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      {inTab ? (
        <CloseTab />
      ) : (
        <BackToPack unlocked />
      )}
    </div>
  );
}
