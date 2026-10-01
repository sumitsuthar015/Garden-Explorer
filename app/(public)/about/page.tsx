import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Compass, Leaf, QrCode, ShieldCheck, Sparkles } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { GardenGallery } from "@/components/public/garden-gallery";
import { PhotoStrip } from "@/components/public/photo-strip";
import { SectionHeading } from "@/components/public/section-heading";
import { VisitSection } from "@/components/public/visit-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBranding } from "@/db/queries/gardens";
import { GARDEN_LOCATION } from "@/lib/constants";
import { GARDEN_PHOTOS } from "@/lib/garden-photos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About the garden",
  description:
    "How a physical garden becomes a self-guided outdoor classroom using QR learning points, observation activities and short quizzes.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    icon: Leaf,
    title: "The garden does the teaching",
    body: "Every activity asks the visitor to look at a real plant, animal or patch of soil. The phone only gives direction.",
  },
  {
    icon: Sparkles,
    title: "Science, logic and coding",
    body: "Stops teach general science, logic puzzles and first coding ideas — patterns, algorithms, loops, bugs and binary — in short, kid-sized lessons.",
  },
  {
    icon: Compass,
    title: "No GPS inside the garden",
    body: "Next-place instructions are written by the garden team in plain words, so the walk stays a walk. A map is offered only to help you find the garden itself.",
  },
  {
    icon: QrCode,
    title: "Signs never go stale",
    body: "QR codes point at a permanent address. Learning content can be rewritten any time without reprinting a single sign.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing to sign up for",
    body: "Visitors never create an account. Progress lives in the visitor's own browser and can be cleared at any time.",
  },
] as const;

export default async function AboutPage() {
  const branding = await getBranding();

  return (
    <>
      {/* Photo banner: the walkway to Babasaheb's statue, slowly drifting. */}
      <section className="relative isolate overflow-hidden bg-[#13261c]">
        <div aria-hidden="true" className="absolute inset-0 -z-10 animate-ken-burns">
          <Image
            src={GARDEN_PHOTOS.statueWalkway.src}
            alt=""
            fill
            preload
            placeholder="blur"
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1a12]/90 via-[#0b1a12]/45 to-[#0b1a12]/10"
        />
        <div className="container-page flex min-h-[24rem] flex-col justify-end gap-3 pt-24 pb-10 text-white sm:min-h-[30rem] sm:pb-14">
          <p className="inline-flex animate-rise items-center gap-2 self-start rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ring-1 ring-white/30 backdrop-blur">
            📸 About the garden
          </p>
          <h1 className="max-w-3xl animate-rise font-heading text-4xl leading-tight font-bold text-balance drop-shadow [animation-delay:120ms] sm:text-6xl">
            {branding.gardenName}
          </h1>
          <p className="max-w-2xl animate-rise text-base leading-relaxed text-white/90 [animation-delay:240ms] sm:text-lg">
            {branding.gardenDescription ||
              "A garden that doubles as an outdoor classroom, with QR learning points placed at the spots that are worth stopping at."}
          </p>
          <p className="animate-rise text-sm text-white/75 [animation-delay:360ms]">
            📍 {GARDEN_LOCATION.officialName}, {GARDEN_LOCATION.area}
          </p>
        </div>
      </section>

      <PhotoStrip />

      <div className="container-page pb-10 sm:pb-14">
        <div className="grid gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((principle, index) => (
            <Reveal key={principle.title} delay={(index % 2) * 120} className="h-full">
              <Card className="group h-full p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3c8a62] to-primary text-primary-foreground shadow-[0_10px_20px_-10px_rgb(47_107_79/0.9)] transition-transform duration-500 group-hover:-rotate-8 group-hover:scale-110">
                  <principle.icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-heading text-base font-semibold">{principle.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{principle.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Reveal as="article" from="left" className="flex flex-col gap-4">
            <h2 className="font-heading text-2xl font-bold">What happens when you scan</h2>
            <ol className="flex flex-col gap-3">
              {[
                "The page recognises which garden place you are standing at.",
                "You see a short arrival screen: the place name, your stop number and what you can learn.",
                "Learning cards give you the science in small pieces — facts, discoveries and things to notice.",
                "An observation activity asks you to find something real, like a butterfly on a flower.",
                "A short quiz checks your thinking. Wrong answers give a hint and another try, never a penalty.",
                "You are told how to walk to the next place, in words.",
              ].map((step, index) => (
                <li key={step} className="group flex gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-transform duration-300 group-hover:scale-125"
                  >
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal as="article" from="right" delay={120} className="flex flex-col gap-4">
            <h2 className="font-heading text-2xl font-bold">For teachers and group leaders</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A trail is an ordered route through the garden. You can point a class at a trail, tell
              them which QR sign to start from, and let them work at their own pace. Because QR signs
              are shared across trails, the same physical stop can appear in the science trail and the
              coding trail without any extra printing.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Visitors who scan out of order are never blocked. If a group starts halfway along a
              trail, the arrival screen simply tells them which stop they have found.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild variant="warm">
                <Link href="/scan">
                  <QrCode aria-hidden="true" />
                  Scan a QR Code
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/explore">Explore places</Link>
              </Button>
            </div>
          </Reveal>
        </div>

        <section className="mt-14 flex flex-col gap-8">
          <Reveal>
            <SectionHeading
              eyebrow="Photo tour"
              title="Take a peek inside"
              description="From the carved gateway to the play area — tap any photo to see it big."
            />
          </Reveal>
          <GardenGallery />
        </section>

        <Reveal className="mt-12">
          <Card className="p-6">
            <h2 className="font-heading text-lg font-semibold">Accessibility and privacy</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The learning experience is designed to work with a screen reader, a keyboard and reduced
              motion preferences. Visitors are not tracked individually and no personal details are
              collected.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/accessibility">Accessibility statement</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/privacy">Privacy notice</Link>
              </Button>
            </div>
          </Card>
        </Reveal>
      </div>
      <VisitSection
        showPolicyLinks={false}
        description="Find the garden in Government Colony, Bandra East. Use the directions below to get here — then let the QR signs guide you."
      />
    </>
  );
}
