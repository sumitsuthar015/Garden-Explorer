import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";

import { MascotSays } from "@/components/kids/mascot";
import { Reveal } from "@/components/motion/reveal";
import { QrScanner } from "@/components/qr/qr-scanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getBranding } from "@/db/queries/gardens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scan a QR code",
  description:
    "Point your phone camera at a Garden Explorer sign to open a garden learning point instantly.",
  alternates: { canonical: "/scan" },
};

const SCAN_TIPS = [
  { emoji: "✋", text: "Hold your phone about a hand away" },
  { emoji: "☀️", text: "Stand where there is light" },
  { emoji: "🔢", text: "No camera? Type the code under the square" },
] as const;

export default async function ScanPage() {
  const branding = await getBranding();

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <MascotSays mood="happy" side="top" mascotClassName="w-24 sm:w-28">
            Point your camera at the QR square on a sign. I&apos;ll open the lesson for you!
          </MascotSays>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">
            Scan a sign <span aria-hidden="true">📷</span>
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Find one of the QR signs in {branding.gardenName}, point your camera at the square, and
            the learning point will open by itself. Nothing to install and no account needed.
          </p>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-3">
          {SCAN_TIPS.map((tip, index) => (
            <Reveal
              as="li"
              key={tip.text}
              delay={index * 90}
              className="flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-950"
            >
              <span aria-hidden="true" className="text-2xl">
                {tip.emoji}
              </span>
              {tip.text}
            </Reveal>
          ))}
        </ul>

        <QrScanner />

        <Alert variant="info" className="rounded-2xl">
          <Info aria-hidden="true" />
          <div>
            <AlertTitle>Your camera stays on your device</AlertTitle>
            <AlertDescription>
              The camera image is only used on your own phone to look for a QR code. Nothing is
              recorded, uploaded or shared, and no location permission is ever requested.
            </AlertDescription>
          </div>
        </Alert>

        <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-card p-5">
          <h2 className="font-heading text-xl font-bold">🗺️ Where are the signs?</h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Each learning point has a printed sign with a big QR square and its code in small letters
            underneath. You will find them along the walkway, in the play area and by the plants
            around the garden — look for the Garden Explorer logo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/explore">See all garden places</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link href="/trails">Browse trails</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
