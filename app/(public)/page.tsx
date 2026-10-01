import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Compass, ExternalLink, MapPin, Navigation, QrCode } from "lucide-react";

import { BadgeShowcase } from "@/components/kids/badge-showcase";
import { LevelLadder } from "@/components/kids/level-ladder";
import { Mascot, MascotSays } from "@/components/kids/mascot";
import { PhotoHunt } from "@/components/kids/photo-hunt";
import { Reveal } from "@/components/motion/reveal";
import { GardenGallery } from "@/components/public/garden-gallery";
import { HeroPhotoBackdrop } from "@/components/public/hero-photo-backdrop";
import { HeroScene } from "@/components/public/hero-scene";
import { LocationCard } from "@/components/public/location-card";
import { SectionHeading } from "@/components/public/section-heading";
import { TrailCard } from "@/components/public/trail-card";
import { Button } from "@/components/ui/button";
import { listPublishedBadges } from "@/db/queries/badges";
import { getBranding } from "@/db/queries/gardens";
import {
  listPublishedCategoriesWithCounts,
  listPublishedLocationCards,
} from "@/db/queries/locations";
import { listPublishedTrails } from "@/db/queries/trails";
import { GARDEN_LOCATION } from "@/lib/constants";
import { GARDEN_PHOTOS } from "@/lib/garden-photos";
import { SUBJECTS } from "@/lib/subjects";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HERO_PERKS = ["✅ Free, no sign-up", "📱 Works on any phone", "🛡️ No ads, no accounts"] as const;

const HOW_TO_PLAY = [
  {
    emoji: "🔍",
    title: "Find a sign",
    body: "Look for a Garden Explorer QR sign along the walkway, in the play area or by the plants.",
  },
  {
    emoji: "📱",
    title: "Scan it",
    body: "Point your phone camera at the square. The lesson opens by itself — nothing to install.",
  },
  {
    emoji: "🧠",
    title: "Learn & play",
    body: "Read fun facts, try a hands-on activity and answer a quick quiz. Wrong answers get hints, never a zero.",
  },
  {
    emoji: "🏆",
    title: "Earn & explore",
    body: "Collect XP and badges, level up, then follow the clue to the next sign.",
  },
] as const;

const GROWN_UP_POINTS = [
  {
    emoji: "🛡️",
    title: "No accounts, no ads",
    body: "Children never sign up. Their progress stays in the browser on their own device.",
  },
  {
    emoji: "📚",
    title: "Science, logic & coding",
    body: "General science, logic puzzles and first coding ideas, in short kid-sized lessons.",
  },
  {
    emoji: "👩‍🏫",
    title: "Great for groups",
    body: "Point a class at a trail. Everyone goes at their own pace and can start at any sign.",
  },
  {
    emoji: "♿",
    title: "Built for everyone",
    body: "Works with screen readers and keyboards, and calms all motion for reduced-motion settings.",
  },
] as const;

const LANDMARKS = [
  "🐘 Carved elephant gate",
  "🌳 Giant banyan tree",
  "📘 Babasaheb's statue",
  "✍️ Signature wall",
  "🌴 Palm grove",
  "🛝 Play area",
] as const;

const HERO_PEEK = [GARDEN_PHOTOS.gate, GARDEN_PHOTOS.statue, GARDEN_PHOTOS.playArea] as const;
const HERO_PEEK_FAN = ["", "group-hover:translate-x-1.5 group-hover:rotate-6", "group-hover:translate-x-3 group-hover:rotate-12"] as const;

const MARQUEE_WORDS = [
  "🔬 Science",
  "🧩 Logic",
  "💻 Coding",
  "🦋 Butterflies",
  "🔢 Patterns",
  "🤖 Robots",
  "🌱 Seeds",
  "💡 Ideas",
  "🐝 Bees",
  "🧠 Puzzles",
] as const;

export default async function HomePage() {
  const [branding, featured, trails, categories, badges] = await Promise.all([
    getBranding(),
    listPublishedLocationCards({ limit: 6 }),
    listPublishedTrails(),
    listPublishedCategoriesWithCounts(),
    listPublishedBadges(),
  ]);

  const featuredLocations = featured.filter((location) => location.featured);
  const homeLocations = (featuredLocations.length > 0 ? featuredLocations : featured).slice(0, 6);

  const countFor = (predicate: (category: string) => boolean) =>
    categories.filter((entry) => predicate(entry.category)).reduce((sum, entry) => sum + entry.total, 0);
  const subjectCounts: Record<string, number> = {
    science: countFor((category) => category !== "logic" && category !== "coding"),
    logic: countFor((category) => category === "logic"),
    coding: countFor((category) => category === "coding"),
  };

  const headlineWords = ["Scan.", "Learn.", "Become", "a"];

  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section id="hero" className="relative isolate overflow-hidden">
        <HeroPhotoBackdrop />
        <HeroScene />

        <div className="container-page relative grid gap-8 pt-10 pb-32 sm:pt-14 sm:pb-40 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-20 lg:pb-44">
          <div className="flex flex-col gap-5">
            <div className="flex animate-rise flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-emerald-800 shadow-soft ring-1 ring-emerald-200">
                🎒 Made for young explorers
              </span>
              <Link
                href="/about#visit"
                className="group inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-sm font-medium text-sky-900 shadow-soft ring-1 ring-sky-200 transition-colors hover:bg-white"
              >
                <MapPin className="size-3.5 text-rose-500 group-hover:animate-wiggle" aria-hidden="true" />
                {GARDEN_LOCATION.area}, Mumbai
              </Link>
            </div>

            <h1 className="font-heading text-[2.35rem] leading-[1.05] font-bold text-balance text-white [text-shadow:0_3px_18px_rgb(0_0_0/0.45)] sm:text-6xl lg:text-[4.1rem]">
              {headlineWords.map((word, index) => (
                <span key={word}>
                  <span
                    className="inline-block animate-bounce-in"
                    style={{ animationDelay: `${80 + index * 110}ms` }}
                  >
                    {word}
                  </span>{" "}
                </span>
              ))}
              <span
                className="text-rainbow inline-block animate-bounce-in drop-shadow-[0_2px_10px_rgb(0_0_0/0.55)] [text-shadow:none]"
                style={{ animationDelay: `${80 + headlineWords.length * 110}ms` }}
              >
                Garden Genius!
              </span>
            </h1>

            <p className="max-w-xl animate-rise text-lg leading-relaxed text-white/90 [animation-delay:600ms] [text-shadow:0_2px_10px_rgb(0_0_0/0.45)] sm:text-xl">
              Find the QR signs hidden around {branding.gardenName}. Every sign unlocks a
              mini-adventure in <strong className="text-sky-300">science</strong>,{" "}
              <strong className="text-fuchsia-300">logic</strong> or{" "}
              <strong className="text-lime-300">coding</strong> — with quizzes, XP and badges to
              collect!
            </p>

            <div className="flex animate-rise flex-col gap-3 [animation-delay:700ms] sm:flex-row">
              <Button
                asChild
                size="xl"
                variant="warm"
                className="group relative overflow-hidden rounded-2xl text-lg shadow-[0_14px_30px_-12px_rgb(231_183_91/0.9)] hover:-translate-y-0.5"
              >
                <Link href="/scan">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-warm/70 animate-ring-pulse"
                  />
                  <QrCode className="transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                  Scan a QR Code
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/45 blur-md animate-sweep"
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="group rounded-2xl border-2 border-white bg-white/95 text-lg backdrop-blur hover:-translate-y-0.5 hover:bg-white"
              >
                <Link href="/explore">
                  <Compass className="transition-transform duration-500 group-hover:rotate-[45deg]" aria-hidden="true" />
                  Explore the Garden
                </Link>
              </Button>
            </div>

            <ul className="flex flex-wrap gap-2 text-sm font-medium text-slate-700">
              {HERO_PERKS.map((perk, index) => (
                <li
                  key={perk}
                  className="animate-rise rounded-full bg-white/95 px-3 py-1.5 shadow-soft ring-1 ring-black/5"
                  style={{ animationDelay: `${800 + index * 90}ms` }}
                >
                  {perk}
                </li>
              ))}
            </ul>

            <a
              href="#real-garden"
              className="group inline-flex animate-rise items-center gap-3 self-start rounded-full bg-white/95 py-1.5 pr-4 pl-1.5 shadow-soft ring-1 ring-black/5 transition-colors [animation-delay:1000ms] hover:bg-white"
            >
              <span className="flex -space-x-3">
                {HERO_PEEK.map((photo, index) => (
                  <span
                    key={photo.id}
                    className={cn(
                      "relative size-10 overflow-hidden rounded-full bg-emerald-100 ring-2 ring-white transition-transform duration-300",
                      HERO_PEEK_FAN[index],
                    )}
                  >
                    <Image src={photo.src} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                ))}
              </span>
              <span className="text-sm font-semibold text-slate-800">📸 See the real garden</span>
              <ArrowDown className="size-4 text-emerald-700 group-hover:animate-bob" aria-hidden="true" />
            </a>
          </div>

          {/* Pip, waving hello, with the three subjects floating around. */}
          <div className="relative mx-auto flex w-full max-w-sm animate-rise flex-col items-center [animation-delay:250ms]">
            <div className="relative mb-2 w-full max-w-[17rem] animate-bounce-in rounded-3xl border-2 border-emerald-200 bg-white px-5 py-4 text-center shadow-lift [animation-delay:900ms]">
              <p className="font-heading text-lg leading-snug font-bold text-slate-900">
                Hi! I&apos;m Pip 👋
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Scan a sign and I&apos;ll meet you there. Let&apos;s learn something awesome!
              </p>
              <span
                aria-hidden="true"
                className="absolute -bottom-2.5 left-1/2 size-4 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-emerald-200 bg-white"
              />
            </div>
            <div className="relative">
              <Mascot mood="wave" className="w-44 sm:w-56" label="Pip, the Garden Explorer robot sprout, waving hello" />
              {SUBJECTS.map((subject, index) => (
                <span
                  key={subject.key}
                  aria-hidden="true"
                  className={cn(
                    "absolute flex size-12 animate-float items-center justify-center rounded-2xl text-2xl text-white shadow-lift ring-4 ring-white sm:size-14 sm:text-3xl",
                    subject.iconBg,
                    ["-top-2 -left-12", "top-1/3 -right-14", "bottom-6 -left-14"][index],
                  )}
                  style={{ animationDelay: `${index * 0.9}s` }}
                >
                  {subject.icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ The real garden */}
      <section
        id="real-garden"
        className="relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-emerald-50/80 via-transparent to-transparent py-14 sm:py-20"
      >
        <div className="container-page">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Real photos"
              title="This is our garden! 📸"
              description={`Garden Explorer signs live in ${GARDEN_LOCATION.officialName}, ${GARDEN_LOCATION.area}. Here's what you'll see when you visit — tap a photo to look closer.`}
            />
          </Reveal>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {LANDMARKS.map((landmark, index) => (
              <Reveal
                as="li"
                key={landmark}
                from="scale"
                delay={index * 70}
                className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-soft ring-1 ring-emerald-100 transition-transform duration-300 hover:-translate-y-0.5 hover:rotate-[-2deg]"
              >
                {landmark}
              </Reveal>
            ))}
          </ul>
          <div className="mt-8 sm:mt-10">
            <GardenGallery />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Subjects */}
      <section className="container-page py-14 sm:py-20">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Pick a subject"
            title="What will you learn today?"
            description="Every QR sign is a mini-lesson. Some are about nature, some are brain-teasers, and some teach you to think like a computer."
          />
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {SUBJECTS.map((subject, index) => {
            const count = subjectCounts[subject.key] ?? 0;
            return (
              <Reveal key={subject.key} delay={index * 120} className="h-full">
                <Link
                  href={subject.href}
                  className={cn(
                    "group relative flex h-full flex-col gap-4 overflow-hidden rounded-[2rem] border-2 bg-gradient-to-br p-6 shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-2 hover:rotate-[-0.6deg] hover:shadow-lift sm:p-7",
                    subject.card,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-6 -right-6 text-9xl opacity-15 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12"
                  >
                    {subject.icon}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-16 animate-bob items-center justify-center rounded-2xl text-4xl shadow-lift ring-4 ring-white",
                      subject.iconBg,
                    )}
                    style={{ animationDelay: `${index * 0.4}s` }}
                  >
                    {subject.icon}
                  </span>
                  <h3 className="font-heading text-3xl font-bold">{subject.label}</h3>
                  <p className="text-base leading-relaxed text-foreground/75">{subject.blurb}</p>
                  <ul className="flex flex-wrap gap-2">
                    {subject.examples.map((example) => (
                      <li
                        key={example}
                        className="rounded-full bg-white/85 px-3 py-1 text-sm font-medium shadow-sm"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                  <span
                    className={cn(
                      "mt-auto inline-flex items-center gap-1.5 pt-2 font-heading text-lg font-bold",
                      subject.accent,
                    )}
                  >
                    {count > 0 ? `${count} place${count === 1 ? "" : "s"} to explore` : "Start exploring"}
                    <ArrowRight
                      className="size-5 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------- How to play */}
      <section className="bg-gradient-to-b from-amber-50 via-amber-50/40 to-transparent py-14 sm:py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="How it works"
              title="How to play — four easy steps"
              description="Everything happens in your phone browser. There is nothing to sign up for and nothing to download."
            />
          </Reveal>

          <div className="relative mt-12">
            {/* The dotted trail joining the four steps on wide screens. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 1000 60"
              preserveAspectRatio="none"
              className="absolute inset-x-[12%] top-6 hidden h-16 w-[76%] lg:block"
            >
              <path
                d="M0 30C120 -5 220 65 333 30S546 -5 666 30 880 65 1000 30"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="4"
                strokeDasharray="2 14"
                strokeLinecap="round"
              />
            </svg>
            <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_TO_PLAY.map((step, index) => (
                <Reveal as="li" key={step.title} delay={index * 140} className="flex flex-col items-center text-center">
                  <span
                    className="relative flex size-24 animate-bob items-center justify-center rounded-full bg-white text-5xl shadow-lift ring-4 ring-amber-200 transition-transform duration-300 hover:scale-110 hover:rotate-6"
                    style={{ animationDelay: `${index * 0.35}s` }}
                  >
                    <span aria-hidden="true">{step.emoji}</span>
                    <span className="absolute -top-1 -right-1 flex size-9 items-center justify-center rounded-full bg-primary font-heading text-base font-bold text-white ring-4 ring-white">
                      {index + 1}
                    </span>
                  </span>
                  <h3 className="mt-4 font-heading text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Photo hunt */}
      <section id="photo-hunt" className="container-page scroll-mt-20 py-14 sm:py-20">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Photo hunt"
            title="Can you spot these in the garden? 🔎"
            description="Each card is a super close-up from a real garden photo. Read the riddle, make a guess, then tap to reveal. On your visit, try to find them all for real!"
          />
        </Reveal>
        <div className="mt-10">
          <PhotoHunt />
        </div>
      </section>

      {/* ---------------------------------------------- Topic ribbons */}
      <div aria-hidden="true" className="relative overflow-hidden py-8">
        <div className="absolute inset-x-[-2rem] top-1/2 -translate-y-1/2 rotate-2 bg-sky-100 py-3 sm:py-4">
          <MarqueeTrack reverse className="text-sky-800/70" />
        </div>
        <div className="relative mx-[-2rem] -rotate-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 py-3 shadow-lift sm:py-4">
          <MarqueeTrack className="text-white" />
        </div>
      </div>

      {/* --------------------------------------------------- Adventures */}
      {trails.length > 0 ? (
        <section className="container-page py-14 sm:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Learning trails"
              title="Pick your adventure"
              description="A trail is a treasure hunt through the garden. Each stop gives you a clue to find the next sign."
              action={
                <Button asChild variant="outline" className="group rounded-full">
                  <Link href="/trails">
                    All trails
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trails.slice(0, 3).map((trail, index) => (
              <Reveal key={trail.id} delay={index * 110} className="h-full">
                <TrailCard trail={trail} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ Levels */}
      <section className="border-y border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-card/30">
        <div className="container-page py-14 sm:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Level up"
              title="Grow from a Seed to a Garden Genius"
              description="Every activity and quiz answer earns XP. The more you explore, the bigger you grow!"
            />
          </Reveal>
          <div className="mt-10">
            <LevelLadder />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Badges */}
      {badges.length > 0 ? (
        <section className="container-page py-14 sm:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Badges"
              title="Collect them all!"
              description="Finish places, trails and quizzes to unlock badges. Can you fill the whole shelf?"
              action={
                <Button asChild variant="outline" className="group rounded-full">
                  <Link href="/progress">
                    My badges
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
          </Reveal>
          <div className="mt-10">
            <BadgeShowcase badges={badges} />
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------- Featured places */}
      {homeLocations.length > 0 ? (
        <section className="border-y border-border bg-card/60">
          <div className="container-page py-14 sm:py-20">
            <Reveal>
              <SectionHeading
                eyebrow="Garden places"
                title="Places to discover"
                description="Each place has its own fun facts, activity and quiz. Scan its QR sign to begin."
                action={
                  <Button asChild variant="outline" className="group rounded-full">
                    <Link href="/explore">
                      View all places
                      <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {homeLocations.map((location, index) => (
                <Reveal key={location.id} delay={(index % 3) * 110} className="h-full">
                  <LocationCard location={location} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------- Nothing published yet */}
      {homeLocations.length === 0 && trails.length === 0 ? (
        <section className="container-page py-10">
          <Reveal from="scale">
            <div className="flex flex-col items-center gap-4 rounded-[2rem] border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 via-card to-amber-50 px-6 py-12 text-center">
              <MascotSays mood="think" side="top">
                New learning points are being planted! Check back soon — or explore the topics
                above.
              </MascotSays>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/explore">
                  <Compass aria-hidden="true" />
                  Explore the garden
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* ---------------------------------------------- For grown-ups */}
      <section className="container-page py-14 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <Reveal from="left" className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="For parents & teachers"
              title="Safe, free and made for learning"
              description={
                branding.gardenDescription ||
                "A garden that doubles as an outdoor classroom, with QR learning points placed at the spots worth stopping at."
              }
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {GROWN_UP_POINTS.map((point) => (
                <li
                  key={point.title}
                  className="group flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-transform duration-300 hover:-translate-y-1"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-2xl transition-transform group-hover:scale-110"
                  >
                    {point.emoji}
                  </span>
                  <div>
                    <h3 className="font-heading text-base font-bold">{point.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/about" className="font-semibold text-primary hover:underline">
                About the project
              </Link>
              <Link href="/accessibility" className="text-muted-foreground hover:text-foreground">
                Accessibility
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
            </div>
          </Reveal>

          <Reveal from="right" delay={120}>
            <div className="flex flex-col gap-4 rounded-[2rem] border-2 border-rose-100 bg-gradient-to-br from-rose-50 via-card to-sky-50 p-6 shadow-soft">
              <p className="inline-flex items-center gap-2 font-heading text-lg font-bold">
                <span aria-hidden="true" className="animate-bob text-2xl">
                  📍
                </span>
                Find the garden
              </p>
              <figure className="group relative overflow-hidden rounded-2xl ring-4 ring-white shadow-soft">
                <div className="relative aspect-[16/10]">
                  <Image
                    src={GARDEN_PHOTOS.gateStreet.src}
                    alt={GARDEN_PHOTOS.gateStreet.alt}
                    fill
                    placeholder="blur"
                    sizes="(max-width: 1024px) 100vw, 420px"
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                </div>
                <figcaption className="absolute bottom-2 left-2 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-800 shadow-soft">
                  👀 Look for this carved gate!
                </figcaption>
              </figure>
              <div>
                <p className="font-semibold">{GARDEN_LOCATION.name}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{GARDEN_LOCATION.address}</p>
              </div>
              <ul className="flex flex-col gap-1.5 text-sm">
                <li className="flex gap-2">
                  <span aria-hidden="true">🕓</span>
                  <span>
                    <span className="font-medium">Open:</span> {GARDEN_LOCATION.openingHours}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden="true">🚉</span>
                  <span>{GARDEN_LOCATION.landmark}</span>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden="true">🛝</span>
                  <span>{GARDEN_LOCATION.features.join(" · ")}</span>
                </li>
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Button asChild variant="warm" className="group rounded-full">
                  <a href={GARDEN_LOCATION.directionsUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation className="transition-transform group-hover:rotate-12" aria-hidden="true" />
                    Get directions
                    <span className="sr-only">(opens Google Maps in a new tab)</span>
                  </a>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <a href={GARDEN_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Open in Google Maps
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Button>
              </div>
              <Link href="/about#visit" className="text-sm font-medium text-primary hover:underline">
                See the map →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- CTA */}
      <section className="container-page">
        <Reveal from="scale">
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 via-green-500 to-lime-400 px-6 py-12 text-white shadow-lift sm:px-12">
            <div
              aria-hidden="true"
              className="sun-rays absolute -top-60 left-1/2 -z-10 size-[40rem] -translate-x-1/2 animate-rays rounded-full"
            />
            <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
              <Mascot mood="cheer" className="w-32 shrink-0 sm:w-40" />
              <div className="flex flex-1 flex-col gap-3">
                <h2 className="font-heading text-4xl font-bold drop-shadow-sm sm:text-5xl">
                  Ready, set, scan!
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
                  Find the nearest Garden Explorer sign and scan it to start your adventure. Your
                  XP and badges are saved on this phone.
                </p>
                <div className="mt-2 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                  <Button asChild size="lg" variant="warm" className="group rounded-full hover:-translate-y-0.5">
                    <Link href="/scan">
                      <QrCode className="transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                      Scan a QR Code
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-white/15 text-white shadow-none backdrop-blur hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/25"
                  >
                    <Link href="/trails">Pick an adventure</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function MarqueeTrack({ reverse = false, className }: { reverse?: boolean; className?: string }) {
  // Two identical halves; the track slides by exactly one half, then repeats.
  const words = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <div className={cn("flex w-max animate-marquee", reverse && "[animation-direction:reverse]", className)}>
      {[0, 1].map((half) => (
        <ul
          key={half}
          className="flex shrink-0 items-center gap-8 pr-8 font-heading text-lg font-bold whitespace-nowrap sm:text-2xl"
        >
          {words.map((word, index) => (
            <li key={index} className="flex items-center gap-8">
              {word}
              <span className="text-amber-300">✦</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
