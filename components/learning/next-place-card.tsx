import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface NextPlaceData {
  position: number;
  name: string;
  slug: string;
  icon: string | null;
  shortDescription: string;
  /** Written physical directions — this product has no maps and no GPS. */
  instruction: string;
}

interface NextPlaceCardProps {
  nextPlace: NextPlaceData;
  totalStops: number;
  trailName: string;
}

/**
 * The next-place panel, framed as the next clue in a treasure hunt.
 *
 * Deliberately instruction-only: there is no map component and no geolocation
 * inside the garden. The garden team writes the walking directions and they are
 * shown here verbatim.
 */
export function NextPlaceCard({ nextPlace, totalStops, trailName }: NextPlaceCardProps) {
  return (
    <Card className="overflow-hidden rounded-3xl border-2 border-sky-200 shadow-lift">
      <div className="flex items-center gap-3 bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-4 text-white">
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-2xl bg-white/20 text-2xl ring-1 ring-white/30"
        >
          <span className="animate-bob">👣</span>
        </span>
        <div>
          <p className="font-heading text-lg leading-tight font-bold">Your next mission</p>
          <p className="text-xs font-medium text-white/85">
            Stop {nextPlace.position} of {totalStops} · {trailName}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 animate-bounce-in items-center justify-center rounded-2xl bg-sky-50 text-3xl ring-2 ring-sky-100"
          >
            {nextPlace.icon ?? "🌿"}
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-2xl leading-snug font-bold">{nextPlace.name}</h3>
            {nextPlace.shortDescription ? (
              <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                {nextPlace.shortDescription}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
          <h4 className="inline-flex items-center gap-2 font-heading text-base font-bold text-amber-900">
            <span aria-hidden="true">🧭</span>
            Your clue: how to get there
          </h4>
          <p className="mt-2 text-base leading-relaxed whitespace-pre-line">{nextPlace.instruction}</p>
          <p className="mt-3 text-sm leading-relaxed text-amber-900/80">
            🔍 When you get there, look for the Garden Explorer sign and scan its QR code.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="warm" size="lg" className="group rounded-full">
            <Link href={`/locations/${nextPlace.slug}`}>
              Continue Trail
              <ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            Can&apos;t find the sign yet? Open the next stop here.
          </span>
        </div>
      </div>
    </Card>
  );
}
