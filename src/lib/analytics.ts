"use client";

/**
 * Privacy-preserving funnel analytics.
 *
 * - Disabled unless NEXT_PUBLIC_POSTHOG_KEY is set.
 * - Anonymous: a random id that lasts for one browser tab session, no cookies,
 *   no person profiles, no autocapture, no session recording.
 * - Only whitelisted, non-identifying properties are sent. File names, titles,
 *   dates, sizes of individual files and file contents are NEVER sent.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");

export type AnalyticsEvent =
  | "landing_viewed"
  | "builder_opened"
  | "files_added"
  | "pack_built"
  | "build_failed"
  | "paywall_shown"
  | "checkout_started"
  | "checkout_unavailable"
  | "purchase_verified"
  | "download_clicked"
  | "fixer_used";

type Props = Record<string, string | number | boolean | undefined>;

const ALLOWED_PROPS = new Set(["count_bucket", "files_bucket", "docs", "kind", "result", "seconds_bucket", "unlocked", "ref"]);

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("lr.sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("lr.sid", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

/** Remembers which outreach link brought this visit (e.g. ?ref=ausvisa-thread). */
export function captureRef() {
  try {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref && /^[a-z0-9_-]{1,40}$/i.test(ref)) sessionStorage.setItem("lr.ref", ref);
  } catch {
    // ignore
  }
}

function currentRef(): string | undefined {
  try {
    return sessionStorage.getItem("lr.ref") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Buckets counts so no exact numbers about someone's evidence are sent. */
export function bucket(n: number): string {
  if (n <= 0) return "0";
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 150) return "51-150";
  return "150+";
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (!KEY || typeof window === "undefined") return;
  const properties: Props = { $process_person_profile: false, $current_url: location.origin + location.pathname };
  for (const [k, v] of Object.entries({ ...props, ref: currentRef() })) {
    if (ALLOWED_PROPS.has(k) && v !== undefined) properties[k] = v;
  }
  const body = JSON.stringify({ api_key: KEY, event, distinct_id: sessionId(), properties, timestamp: new Date().toISOString() });
  try {
    const url = `${HOST}/i/v0/e/`;
    // text/plain keeps the request "simple" (no CORS preflight); PostHog parses the JSON body regardless.
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    else void fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" } });
  } catch {
    // Analytics must never break the product.
  }
}

export const analyticsHost = KEY ? HOST : null;
