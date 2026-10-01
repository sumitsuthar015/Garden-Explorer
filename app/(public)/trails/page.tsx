import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/public/section-heading";
import { TrailGrid } from "@/components/trail/trail-grid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getBranding } from "@/db/queries/gardens";
import { listPublishedTrails } from "@/db/queries/trails";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learning trails",
  description:
    "Follow a planned route through the garden. Each trail tells you exactly which sign to scan and how to walk to the next place.",
  alternates: { canonical: "/trails" },
};

export default async function TrailsPage() {
  const [branding, trails] = await Promise.all([getBranding(), listPublishedTrails()]);

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        as="h1"
        eyebrow="Learning trails"
        title="Follow a trail through the garden"
        description={`A trail is an ordered walk through ${branding.gardenName}. At each stop you learn, observe and answer a quick question — then we tell you how to reach the next sign.`}
        action={
          <Button asChild variant="warm">
            <Link href="/scan">Scan a QR Code</Link>
          </Button>
        }
      />

      <div className="mt-8">
        {trails.length === 0 ? (
          <EmptyState
            icon={<Compass className="size-5" aria-hidden="true" />}
            title="No learning trails yet"
            description="A trail is created by arranging garden places in order inside the admin area. Once one is published it appears here for every visitor."
            action={
              <Button asChild variant="outline">
                <Link href="/explore">Browse garden places instead</Link>
              </Button>
            }
          />
        ) : (
          <TrailGrid trails={trails} />
        )}
      </div>

      <Reveal className="mt-12 rounded-2xl border border-border bg-gradient-to-br from-card to-accent/50 p-5 shadow-soft sm:p-6">
        <h2 className="font-heading text-lg font-semibold">How to follow a trail</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {[
            "Open a trail below and read what it covers.",
            "Walk to the first stop and scan the QR code on its sign.",
            "At the end of each stop you are given written directions to the next sign.",
            "Scan that sign to continue. You can always jump ahead — nothing is locked.",
          ].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                {index + 1}
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </Reveal>
    </div>
  );
}
