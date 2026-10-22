"use client";

import { Compass } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Notice } from "@/components/ui/Controls";
import { track } from "@/lib/analytics";

const APPS: [RegExp, string][] = [
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/Instagram/i, "Instagram"],
  [/BytedanceWebview|musical_ly|TikTok/i, "TikTok"],
  [/MicroMessenger/i, "WeChat"],
  [/\bLine\//i, "LINE"],
  [/Snapchat/i, "Snapchat"],
];

function detect(userAgent: string): string | null {
  return APPS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

const subscribe = () => () => {};

/**
 * Links shared in Facebook groups, Instagram or TikTok open in the app's own browser, where downloads often fail and
 * saved files are kept apart from Safari or Chrome. Suggest opening the page in the real browser.
 */
export function InAppBrowserNotice() {
  const app = useSyncExternalStore(subscribe, () => detect(navigator.userAgent), () => null);
  useEffect(() => {
    if (app) track("in_app_browser", { kind: app.toLowerCase() });
  }, [app]);
  if (!app) return null;
  return (
    <div className="mb-5">
      <Notice tone="warning" icon={<Compass className="size-5 text-warning" aria-hidden="true" />}>
        <p>
          <strong className="font-semibold">You’re in {app}’s built-in browser.</strong> Downloads and saved files may not work
          here. Open this page in Safari or Chrome: tap the ••• or share button, then “Open in browser”.
        </p>
      </Notice>
    </div>
  );
}
