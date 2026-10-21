"use client";

/**
 * The unlock is stored in this browser after Stripe confirms payment on our
 * server. The tool runs entirely on-device, so this is an honesty-based gate:
 * it keeps paying simple rather than trying to be uncrackable.
 */
const LICENSE_KEY = "lodgeready.license";
const UNLOCK_LINK_KEY = "lodgeready.unlockLink";

export function getLicense(): string | null {
  try {
    return localStorage.getItem(LICENSE_KEY);
  } catch {
    return null;
  }
}

export function hasLicense(): boolean {
  const token = getLicense();
  return Boolean(token && /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token));
}

export function storeLicense(token: string, unlockLink?: string) {
  try {
    localStorage.setItem(LICENSE_KEY, token);
    if (unlockLink) localStorage.setItem(UNLOCK_LINK_KEY, unlockLink);
  } catch {
    // Storage blocked: the unlock still applies for this page view.
  }
}

export function getUnlockLink(): string | null {
  try {
    return localStorage.getItem(UNLOCK_LINK_KEY);
  } catch {
    return null;
  }
}
