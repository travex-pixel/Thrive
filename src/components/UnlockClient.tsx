"use client";

import { CircleCheck, Copy, LoaderCircle, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Controls";
import { track } from "@/lib/analytics";
import { storeLicense } from "@/lib/license-client";

type State = { status: "checking" } | { status: "ok"; link: string } | { status: "error"; message: string; retry: boolean };

export function UnlockClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [state, setState] = useState<State>({ status: "checking" });
  const [copied, setCopied] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      attempts.current++;
      try {
        const res = await fetch(`/api/verify?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { token?: string; message?: string };
        if (cancelled) return;
        if (res.ok && data.token) {
          const link = `${window.location.origin}/unlock?session_id=${encodeURIComponent(sessionId)}`;
          storeLicense(data.token, link);
          setState({ status: "ok", link });
          track("purchase_verified");
          return;
        }
        // Stripe can take a moment to mark a session paid; retry a few times.
        if (res.status === 402 && attempts.current < 5) {
          window.setTimeout(verify, 1500);
          return;
        }
        setState({ status: "error", message: data.message ?? "We couldn’t confirm your payment.", retry: res.status >= 500 || res.status === 402 });
      } catch {
        if (!cancelled) setState({ status: "error", message: "You seem to be offline. Reconnect and try again.", retry: true });
      }
    };
    void verify();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

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
          <ButtonLink href="/build" variant="secondary" size="lg">
            Back to my pack
          </ButtonLink>
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
          <p className="mt-1 text-label-2">Thank you. Unlimited packs are now switched on in this browser.</p>
        </div>
      </div>
      <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
        <p className="font-semibold">Save your unlock link</p>
        <p className="mt-1 text-[0.9375rem] text-label-2">
          Open it on another device, or after clearing your browser, to unlock again. Keep it private.
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
      <ButtonLink href="/build?unlocked=1" size="lg">
        Back to my pack
      </ButtonLink>
    </div>
  );
}
