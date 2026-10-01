"use client";

import * as React from "react";
import Image from "next/image";
import { RotateCcw, Search, Undo2 } from "lucide-react";

import { Mascot } from "@/components/kids/mascot";
import { celebrate } from "@/lib/celebrate";
import { PHOTO_HUNT, type PhotoHuntCard } from "@/lib/garden-photos";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const CARD_TINTS = [
  "from-amber-300 to-orange-400",
  "from-sky-300 to-indigo-400",
  "from-lime-300 to-emerald-500",
  "from-fuchsia-300 to-violet-500",
  "from-yellow-300 to-amber-500",
  "from-teal-300 to-cyan-500",
] as const;

/**
 * "Can you spot it?" — each card starts as a zoomed-in mystery close-up from a
 * real garden photo with a riddle. Tapping flips it to the whole photo and the
 * answer. Nothing is saved; it is a warm-up for the real visit.
 */
export function PhotoHunt({ cards = PHOTO_HUNT }: { cards?: PhotoHuntCard[] }) {
  const [found, setFound] = React.useState<ReadonlySet<string>>(() => new Set());
  const [flipped, setFlipped] = React.useState<ReadonlySet<string>>(() => new Set());
  const [announcement, setAnnouncement] = React.useState("");

  const allFound = found.size === cards.length;

  function reveal(card: PhotoHuntCard) {
    setFlipped((previous) => new Set(previous).add(card.id));
    setAnnouncement(`Found it! ${card.answer} ${card.fact}`);
    if (found.has(card.id)) return;

    const next = new Set(found).add(card.id);
    setFound(next);
    if (next.size === cards.length) {
      playSound("complete");
      celebrate("big");
    } else {
      playSound("correct");
      celebrate("small");
    }
  }

  function hide(card: PhotoHuntCard) {
    playSound("pop");
    setFlipped((previous) => {
      const next = new Set(previous);
      next.delete(card.id);
      return next;
    });
  }

  function reset() {
    playSound("pop");
    setFound(new Set());
    setFlipped(new Set());
    setAnnouncement("All the cards are hidden again. Ready, detective?");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full max-w-xl items-center gap-4 rounded-3xl border-2 border-amber-200 bg-white/90 p-4 shadow-soft">
        <Mascot mood={allFound ? "cheer" : found.size > 0 ? "happy" : "think"} className="w-16 shrink-0 sm:w-20" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-heading text-base font-bold sm:text-lg">
            {allFound
              ? "Wow, Photo Detective! You found them all! 🏆"
              : found.size === 0
                ? "Tap a card to reveal what's hiding in the photo!"
                : `Great spotting! ${cards.length - found.size} more to find.`}
          </p>
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-label="Photo hunt progress"
              aria-valuemin={0}
              aria-valuemax={cards.length}
              aria-valuenow={found.size}
              className="h-3 flex-1 overflow-hidden rounded-full bg-amber-100"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-[width] duration-700 ease-out"
                style={{ width: `${(found.size / cards.length) * 100}%` }}
              />
            </div>
            <span className="shrink-0 font-heading text-sm font-bold text-amber-700">
              {found.size}/{cards.length}
            </span>
          </div>
        </div>
        {found.size > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="flex size-10 shrink-0 animate-pop items-center justify-center rounded-full bg-amber-100 text-amber-800 transition-transform hover:rotate-[-90deg] focus-visible:outline-4 focus-visible:outline-amber-400"
            aria-label="Play again"
          >
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-2 pb-6 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
        {cards.map((card, index) => (
          <HuntCard
            key={card.id}
            card={card}
            number={index + 1}
            tint={CARD_TINTS[index % CARD_TINTS.length]}
            flipped={flipped.has(card.id)}
            found={found.has(card.id)}
            onReveal={() => reveal(card)}
            onHide={() => hide(card)}
          />
        ))}
      </ol>
    </div>
  );
}

function HuntCard({
  card,
  number,
  tint,
  flipped,
  found,
  onReveal,
  onHide,
}: {
  card: PhotoHuntCard;
  number: number;
  tint: string;
  flipped: boolean;
  found: boolean;
  onReveal: () => void;
  onHide: () => void;
}) {
  const revealRef = React.useRef<HTMLButtonElement>(null);
  const hideRef = React.useRef<HTMLButtonElement>(null);
  const changed = React.useRef(false);

  // Keep keyboard focus on the face that is showing after a flip.
  React.useEffect(() => {
    if (!changed.current) {
      changed.current = true;
      return;
    }
    (flipped ? hideRef : revealRef).current?.focus({ preventScroll: true });
  }, [flipped]);

  const [x, y] = card.focus;
  const tilt = ["-1.5deg", "1.2deg", "-0.8deg", "1.6deg", "-1.2deg", "0.9deg"][(number - 1) % 6];

  return (
    <li
      className="flip-scene w-[80vw] max-w-sm shrink-0 snap-center sm:w-auto sm:max-w-none"
      style={{ "--tilt": tilt } as React.CSSProperties}
    >
      <div
        data-flipped={flipped}
        className="flip-inner relative h-[27rem] data-[flipped=false]:hover:rotate-[var(--tilt)]"
      >
        {/* Front: the mystery close-up and the riddle. */}
        <div
          inert={flipped}
          className="flip-face absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-lift"
        >
          <div className={cn("relative h-52 shrink-0 overflow-hidden bg-gradient-to-br", tint)}>
            <div className="absolute -inset-[6%] animate-peek" style={{ animationDelay: `${number * -1.4}s` }}>
              <Image
                src={card.photo.src}
                alt="A zoomed-in mystery close-up from a garden photo"
                fill
                sizes="(max-width: 640px) 160vw, 720px"
                className="object-cover"
                // Zoom in around the focus point, then slide it under the lens.
                style={{
                  objectPosition: `${x}% ${y}%`,
                  transform: `translate(${50 - x}%, ${50 - y}%) scale(${card.zoom})`,
                  transformOrigin: `${x}% ${y}%`,
                }}
              />
            </div>
            {/* Detective lens: the close-up shines through a ring, the rest dims. */}
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_999px_rgb(15_23_42/0.38)] ring-4 ring-white/90"
            />
            <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 font-heading text-xs font-bold text-slate-800 shadow-soft">
              🔎 Mystery #{number}
            </span>
            {found ? (
              <span className="absolute top-3 right-3 animate-pop rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-soft">
                ✓ Found
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-base leading-snug font-semibold text-slate-800">{card.clue}</p>
            <button
              ref={revealRef}
              type="button"
              onClick={onReveal}
              className={cn(
                "group mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r px-5 font-heading text-base font-bold text-white shadow-[0_10px_22px_-12px_rgb(0_0_0/0.6)] transition-transform hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-400",
                tint,
              )}
            >
              <Search className="size-5 transition-transform group-hover:scale-125" aria-hidden="true" />
              {found ? "See it again" : "Reveal the answer"}
            </button>
          </div>
        </div>

        {/* Back: the whole photo and the answer. */}
        <div
          inert={!flipped}
          className="flip-face flip-back absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-lift"
        >
          <div className="relative h-52 shrink-0 overflow-hidden bg-emerald-100">
            <Image
              src={card.photo.src}
              alt={card.photo.alt}
              fill
              placeholder="blur"
              sizes="(max-width: 640px) 80vw, 400px"
              className={cn("object-cover", flipped && "animate-ken-burns")}
            />
            {flipped ? (
              <span className="absolute bottom-3 left-3 animate-bounce-in rounded-full bg-emerald-500 px-3 py-1.5 font-heading text-sm font-bold text-white shadow-lift [animation-delay:350ms]">
                🎉 You found it!
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <p className="font-heading text-lg leading-snug font-bold text-emerald-800">{card.answer}</p>
            <p className="text-sm leading-relaxed text-slate-600">{card.fact}</p>
            <button
              ref={hideRef}
              type="button"
              onClick={onHide}
              className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Show the riddle again
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
