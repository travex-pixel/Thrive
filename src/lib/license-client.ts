"use client";

/**
 * The unlock is stored in this browser after Stripe confirms payment on our server. The tool runs entirely on-device,
 * so this is an honesty-based gate: it keeps paying simple rather than trying to be uncrackable. (Tokens are signed,
 * so they can be checked on the server if that's ever needed, but the browser only checks their shape.)
 */
const LICENSE_KEY = "lodgeready.license";
const UNLOCK_LINK_KEY = "lodgeready.unlockLink";
const TOKEN_SHAPE = /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** Used when the browser won't let us store anything: the unlock then lasts until this tab closes. */
let memoryLicense: string | null = null;
let memoryLink: string | null = null;

export function getLicense(): string | null {
  try {
    return localStorage.getItem(LICENSE_KEY) ?? memoryLicense;
  } catch {
    return memoryLicense;
  }
}

export function hasLicense(): boolean {
  const token = getLicense();
  return Boolean(token && TOKEN_SHAPE.test(token));
}

/** Returns false if the browser wouldn't save it (the unlock then only lasts while this tab is open). */
export function storeLicense(token: string, unlockLink?: string): boolean {
  memoryLicense = token;
  if (unlockLink) memoryLink = unlockLink;
  try {
    localStorage.setItem(LICENSE_KEY, token);
    if (unlockLink) localStorage.setItem(UNLOCK_LINK_KEY, unlockLink);
    return true;
  } catch {
    return false;
  }
}

export function getUnlockLink(): string | null {
  try {
    return localStorage.getItem(UNLOCK_LINK_KEY) ?? memoryLink;
  } catch {
    return memoryLink;
  }
}

/** Calls back when another tab (e.g. the checkout tab) stores an unlock. */
export function onLicenseStored(callback: () => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key === null || event.key === LICENSE_KEY) callback();
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
