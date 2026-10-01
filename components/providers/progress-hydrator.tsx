"use client";

import { useEffect } from "react";

import { hydrate } from "@/lib/progress/store";

/**
 * Hydrates the anonymous progress record once on load so a visitor id exists
 * before any analytics event is sent. Renders nothing.
 */
export function ProgressHydrator() {
  useEffect(() => {
    hydrate();
  }, []);

  return null;
}
