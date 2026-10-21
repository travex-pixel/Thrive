import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Returns a Stripe client, or null when payments aren't configured (e.g. local dev). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, {
    appInfo: { name: "LodgeReady" },
    maxNetworkRetries: 2,
    timeout: 15_000,
  });
  return client;
}

/**
 * The public site URL used in Stripe redirect URLs. Always prefer the
 * configured value in production so redirects can't be influenced by a
 * spoofed Host header.
 */
export function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

/** Rejects cross-site POSTs. Browsers always send Origin on cross-origin POST requests. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin navigations/fetches from older browsers
  try {
    return new URL(origin).host === new URL(siteOrigin(request)).host;
  } catch {
    return false;
  }
}

export const CHECKOUT_SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
