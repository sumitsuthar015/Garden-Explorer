import Link from "next/link";
import { CircleSlash, Home, QrCode, SearchX, TriangleAlert } from "lucide-react";

import { Mascot } from "@/components/kids/mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type QrProblem = "invalid_format" | "not_found" | "inactive" | "location_unavailable" | "error";

const COPY: Record<
  QrProblem,
  { title: string; body: string; icon: typeof SearchX; tone: "neutral" | "warning" }
> = {
  invalid_format: {
    title: "That code doesn't look right",
    body: "A Garden Explorer code is made of capital letters, numbers and dashes — for example BUTTERFLY-003. Check the small print under the QR square and try again.",
    icon: TriangleAlert,
    tone: "warning",
  },
  not_found: {
    title: "QR Code Not Found",
    body: "This QR code is not recognised. It may belong to a different garden, or the sign may have been replaced. Try scanning again from close up.",
    icon: SearchX,
    tone: "neutral",
  },
  inactive: {
    title: "Learning Point Unavailable",
    body: "This learning point is currently inactive. Please continue to the next marked learning point — the rest of the trail is waiting.",
    icon: CircleSlash,
    tone: "warning",
  },
  location_unavailable: {
    title: "This place isn't available yet",
    body: "The garden team is still preparing this learning point. Please carry on to the next sign — we'd rather not show you unfinished content.",
    icon: CircleSlash,
    tone: "warning",
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't load this learning point. Your place in the trail is safe — nothing has been lost. Please try again.",
    icon: TriangleAlert,
    tone: "warning",
  },
};

interface QrStatusScreenProps {
  problem: QrProblem;
  /** Shown when the code resolved to a real place that is simply switched off. */
  locationName?: string | null;
  scannedCode?: string | null;
}

/** Visitor-facing error screens. Technical details are never shown here. */
export function QrStatusScreen({ problem, locationName, scannedCode }: QrStatusScreenProps) {
  const copy = COPY[problem] ?? COPY.error;

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md rounded-3xl border-2 p-6 text-center sm:p-8">
        <Mascot mood={copy.tone === "warning" ? "think" : "oops"} className="mx-auto w-28" />

        <h1 className="mt-5 font-heading text-2xl leading-tight font-bold text-balance">
          {copy.title}
        </h1>

        {locationName ? (
          <p className="mt-2 font-medium text-muted-foreground">{locationName}</p>
        ) : null}

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>

        {scannedCode ? (
          <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground wrap-anywhere">
            Scanned code: <span className="font-mono font-medium">{scannedCode}</span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="warm" className="rounded-full">
            <Link href="/scan">
              <QrCode aria-hidden="true" />
              Scan Again
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">
              <Home aria-hidden="true" />
              Go Home
            </Link>
          </Button>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Looking for a place you already know? You can open it directly from{" "}
          <Link href="/explore" className="text-primary hover:underline">
            Explore the garden
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
