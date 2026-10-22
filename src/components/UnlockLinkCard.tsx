"use client";

import { Copy, Mail } from "lucide-react";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { track } from "@/lib/analytics";

/**
 * The unlock lives in this browser's storage, which a browser can clear (Safari after 7 days without a visit), so
 * buyers are asked to keep their unlock link. "Email it to me" opens their own mail app; nothing is sent by us.
 */
export function UnlockLinkCard({ link, compact = false }: { link: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const mailto = `mailto:?subject=${encodeURIComponent("My LodgeReady unlock link")}&body=${encodeURIComponent(
    `Keep this link private. Open it to unlock LodgeReady again in another browser, on another device, or after your browser data is cleared:\n\n${link}\n`,
  )}`;
  return (
    <div className={compact ? "" : "rounded-[var(--radius-card)] bg-surface p-5 shadow-card"}>
      <p className="font-semibold">Save your unlock link</p>
      <p className="mt-1 text-[0.9375rem] text-label-2">
        Browsers can clear saved data, so keep this link somewhere safe. It unlocks LodgeReady again in any browser. Keep it
        private.
      </p>
      <input
        readOnly
        value={link}
        aria-label="Your unlock link"
        onFocus={(e) => e.currentTarget.select()}
        className="mt-3 block min-h-11 w-full rounded-[var(--radius-control)] border border-separator bg-surface-2 px-3 text-[0.875rem] text-label-2"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              track("unlock_link_saved", { kind: "copy" });
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy className="size-5" aria-hidden="true" />
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a href={mailto} className={buttonClasses("plain")} onClick={() => track("unlock_link_saved", { kind: "email" })}>
          <Mail className="size-5" aria-hidden="true" />
          Email it to me
        </a>
      </div>
    </div>
  );
}
