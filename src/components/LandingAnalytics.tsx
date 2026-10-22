"use client";

import { useEffect } from "react";
import { captureRef, track } from "@/lib/analytics";

/** Once per page load: the landing page can be hidden and shown again without reloading (Cache Components). */
let tracked = false;

export function LandingAnalytics() {
  useEffect(() => {
    captureRef();
    if (tracked) return;
    tracked = true;
    track("landing_viewed");
  }, []);
  return null;
}
