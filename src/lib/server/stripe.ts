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

function normalise(origin: string): string | null {
  try {
    return new URL(origin.trim()).origin;
  } catch {
    return null;
  }
}

/**
 * Origins allowed to start checkout and to receive Stripe's redirects. Read at request time (not NEXT_PUBLIC_*,
 * which is fixed into the code at build time), so a custom domain, a www alias or a deploy preview can be added in
 * the hosting settings without a rebuild:
 *   SITE_URL         the main address, e.g. https://lodgeready.example
 *   ALLOWED_ORIGINS  optional extra addresses, comma-separated
 */
export function allowedOrigins(request: Request): string[] {
  // Vercel exposes the addresses of the current deployment, so previews work without extra settings.
  const vercel = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
  const configured = [process.env.SITE_URL, process.env.NEXT_PUBLIC_SITE_URL, ...(process.env.ALLOWED_ORIGINS ?? "").split(","), ...vercel]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map(normalise)
    .filter((v): v is string => Boolean(v));
  // Local development with nothing configured: the request's own origin.
  return configured.length > 0 ? [...new Set(configured)] : [new URL(request.url).origin];
}

/** The site's main address, used when a request doesn't say where it came from. */
export function siteOrigin(request: Request): string {
  return allowedOrigins(request)[0];
}

/**
 * Where Stripe should send the buyer back: the page they paid from, if that address is allowed. Never taken from
 * the Host header, so a spoofed host can't redirect anyone.
 */
export function returnOrigin(request: Request): string {
  const origin = normalise(request.headers.get("origin") ?? "");
  return origin && allowedOrigins(request).includes(origin) ? origin : siteOrigin(request);
}

/**
 * Accepts only POSTs from our own pages. Browsers always send Origin on POST requests, so a missing Origin means
 * the request didn't come from a browser page and is refused.
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = normalise(request.headers.get("origin") ?? "");
  return Boolean(origin && allowedOrigins(request).includes(origin));
}

export const CHECKOUT_SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
