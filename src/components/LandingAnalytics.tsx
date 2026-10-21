"use client";

import { useEffect } from "react";
import { captureRef, track } from "@/lib/analytics";

export function LandingAnalytics() {
  useEffect(() => {
    captureRef();
    track("landing_viewed");
  }, []);
  return null;
}
