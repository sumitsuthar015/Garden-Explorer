"use client";

import * as React from "react";

import { recordScanAction } from "@/lib/actions/learning";
import { getVisitorId } from "@/lib/progress/store";

/**
 * Records the QR scan exactly once per page visit.
 *
 * Doing this from the client (rather than during server rendering) keeps the
 * counter honest: React Server Components can render more than once, and
 * recording during render would inflate `scan_count`. Renders nothing.
 */
export function ScanRecorder({
  publicCode,
  trailSlug,
}: {
  publicCode: string;
  trailSlug: string | null;
}) {
  const recorded = React.useRef(false);

  React.useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;

    // A scan should be counted even if the visitor immediately navigates away,
    // so the identifier is read before the request is dispatched.
    getVisitorId();

    void recordScanAction(publicCode, trailSlug).catch(() => {
      /* analytics must never interrupt the learning experience */
    });
  }, [publicCode, trailSlug]);

  return null;
}
