"use client";

/**
 * Only one tab may change the saved workspace at a time, so two open tabs can never overwrite each other's files or
 * clear each other's work. The newest tab takes over (Web Locks with `steal`); the previous one finishes its last
 * save, says so, and switches to a "open in another tab" notice. Browsers without Web Locks simply skip this.
 */
const LOCK_NAME = "lodgeready-workspace";
const CHANNEL_NAME = "lodgeready-workspace";

export interface WorkspaceClaim {
  /** Call once the tab has finished its last save after losing ownership. */
  flushed: () => void;
}

function channel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/** Waits briefly for the previous owner to confirm its last save landed. */
function waitForFlush(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const bc = channel();
    const done = () => {
      clearTimeout(timer);
      bc?.close();
      resolve();
    };
    const timer = setTimeout(done, ms);
    if (bc) bc.onmessage = (event) => event.data === "flushed" && done();
  });
}

export async function claimWorkspace(onLost: () => void): Promise<WorkspaceClaim> {
  const claim: WorkspaceClaim = {
    flushed: () => {
      const bc = channel();
      bc?.postMessage("flushed");
      bc?.close();
    },
  };
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return claim;

  let hadOwner = false;
  try {
    hadOwner = Boolean((await locks.query()).held?.some((lock) => lock.name === LOCK_NAME));
  } catch {
    // query() isn't essential
  }

  await new Promise<void>((acquired) => {
    const fallback = setTimeout(acquired, 2000); // never block the app on a lock
    locks
      .request(LOCK_NAME, { steal: true }, () => {
        clearTimeout(fallback);
        acquired();
        return new Promise<void>(() => {}); // hold until the tab closes or another tab takes over
      })
      .catch((error: unknown) => {
        clearTimeout(fallback);
        acquired();
        if (error instanceof DOMException && error.name === "AbortError") onLost();
      });
  });

  if (hadOwner) await waitForFlush(1500);
  return claim;
}
