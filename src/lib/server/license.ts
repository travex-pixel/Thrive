import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unlock tokens: v1.<base64url(payload)>.<base64url(HMAC-SHA256)>.
 * Issued only after Stripe confirms a paid Checkout Session.
 */
export interface LicensePayload {
  v: 1;
  /** Stripe Checkout Session id that paid for the unlock. */
  sid: string;
  /** Issued-at, ms since epoch. */
  iat: number;
}

function secret(): string {
  const value = process.env.LICENSE_SIGNING_SECRET;
  if (!value || value.length < 32) throw new Error("LICENSE_SIGNING_SECRET is missing or too short (need 32+ chars).");
  return value;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function signLicense(payload: LicensePayload, key = secret()): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac("sha256", key).update(`v1.${body}`).digest());
  return `v1.${body}.${sig}`;
}

export function verifyLicense(token: string, key = secret()): LicensePayload | null {
  const match = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!match) return null;
  const expected = createHmac("sha256", key).update(`v1.${match[1]}`).digest();
  const given = Buffer.from(match[2], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8")) as LicensePayload;
    return payload.v === 1 && typeof payload.sid === "string" ? payload : null;
  } catch {
    return null;
  }
}

export function isSigningConfigured(): boolean {
  const value = process.env.LICENSE_SIGNING_SECRET;
  return Boolean(value && value.length >= 32);
}
