import Image from "next/image";
import Link from "next/link";
import { Clock, ExternalLink, Footprints, MapPin, Navigation, QrCode, TrainFront } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { GardenMap } from "@/components/public/garden-map";
import { SectionHeading } from "@/components/public/section-heading";
import { Button } from "@/components/ui/button";
import { GARDEN_LOCATION } from "@/lib/constants";
import { GARDEN_PHOTOS } from "@/lib/garden-photos";

interface VisitSectionProps {
  description: string;
  /** The about page already links to its own policies. */
  showPolicyLinks?: boolean;
}

/** "How to get here": address, directions and the garden map. */
export function VisitSection({ description, showPolicyLinks = true }: VisitSectionProps) {
  const details = [
    {
      icon: MapPin,
      title: "Address",
      body: `${GARDEN_LOCATION.officialName}, ${GARDEN_LOCATION.address}`,
    },
    {
      icon: Clock,
      title: "Opening hours",
      body: `${GARDEN_LOCATION.openingHours}. Timings can change, so check before a special trip.`,
    },
    {
      icon: TrainFront,
      title: "Getting there",
      body: `${GARDEN_LOCATION.landmark}. Plus code: ${GARDEN_LOCATION.plusCode}.`,
    },
    {
      icon: Footprints,
      title: "What's inside",
      body: `${GARDEN_LOCATION.features.join(", ")} — and Garden Explorer QR signs to scan. Inside the garden every direction is written, no map needed.`,
    },
  ] as const;

  return (
    <section id="visit" className="relative overflow-hidden">
      <div className="container-page py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          <Reveal from="left" className="flex flex-col gap-7">
            <SectionHeading
              eyebrow="Visit the garden"
              title={GARDEN_LOCATION.name}
              description={description}
            />

            <ul className="flex flex-col gap-4">
              {details.map((detail) => (
                <li key={detail.title} className="group flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <detail.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-semibold">{detail.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {detail.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="warm" size="lg" className="group">
                <a href={GARDEN_LOCATION.directionsUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation
                    className="transition-transform duration-300 group-hover:rotate-12"
                    aria-hidden="true"
                  />
                  Get directions
                  <span className="sr-only">(opens Google Maps in a new tab)</span>
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={GARDEN_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Open in Google Maps
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Garden details from public listings ({GARDEN_LOCATION.sources}).
            </p>

            {showPolicyLinks ? (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <Link href="/about" className="font-medium text-primary hover:underline">
                  About the garden
                </Link>
                <Link href="/accessibility" className="text-muted-foreground hover:text-foreground">
                  Accessibility
                </Link>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacy
                </Link>
                <Link
                  href="/scan"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <QrCode className="size-3.5" aria-hidden="true" />
                  Already here? Scan a sign
                </Link>
              </div>
            ) : null}
          </Reveal>

          <Reveal from="right" delay={120} className="relative">
            {/* A taped-on polaroid of the gate: what to look for when you arrive. */}
            <figure className="relative z-10 mx-auto mb-6 w-56 animate-float-slow lg:absolute lg:-top-8 lg:-right-4 lg:mb-0 lg:w-52">
              <div className="rotate-[4deg] rounded-xl bg-white p-2 pb-3 shadow-lift ring-1 ring-black/5 transition-transform duration-500 hover:rotate-0 hover:scale-105">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-emerald-100">
                  <Image
                    src={GARDEN_PHOTOS.gate.src}
                    alt={GARDEN_PHOTOS.gate.alt}
                    fill
                    placeholder="blur"
                    sizes="224px"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-center font-heading text-sm font-bold text-slate-800">
                  👀 Look for this gate!
                </figcaption>
              </div>
              <span
                aria-hidden="true"
                className="absolute -top-2 left-1/2 h-5 w-16 -translate-x-1/2 -rotate-6 rounded-sm bg-amber-200/80 shadow-sm"
              />
            </figure>
            <GardenMap />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
