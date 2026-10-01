"use client";

import * as React from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

import { GARDEN_PHOTOS } from "@/lib/garden-photos";
import { cn } from "@/lib/utils";

/** Where each photo should stay centred when a narrow screen crops it. */
const SLIDES = [
  { photo: GARDEN_PHOTOS.gate, position: "50% 38%" },
  { photo: GARDEN_PHOTOS.statueWalkway, position: "50% 45%" },
  { photo: GARDEN_PHOTOS.playArea, position: "42% 55%" },
  { photo: GARDEN_PHOTOS.signatureWall, position: "68% 50%" },
  { photo: GARDEN_PHOTOS.gateStreet, position: "45% 40%" },
] as const;

const INTERVAL_MS = 6500;

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The home hero's background: real photos of the garden, cross-fading with a
 * slow camera drift, under a shade that keeps the white headline readable.
 *
 * It advances on its own unless the visitor prefers reduced motion; the dots
 * jump to a photo and the button pauses or resumes the slideshow.
 */
export function HeroPhotoBackdrop() {
  const [index, setIndex] = React.useState(0);
  // null until the visitor chooses; until then reduced motion decides.
  const [playChoice, setPlayChoice] = React.useState<boolean | null>(null);
  const reducedMotion = React.useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const playing = playChoice ?? !reducedMotion;

  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % SLIDES.length), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, playing]);

  const current = SLIDES[index].photo;

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#0c2a1d]">
        {SLIDES.map((slide, slideIndex) => (
          <div
            key={slide.photo.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1600ms] ease-in-out",
              slideIndex === index ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="absolute inset-0 animate-ken-burns" style={{ animationDelay: `${slideIndex * -4.4}s` }}>
              <Image
                src={slide.photo.src}
                alt=""
                fill
                sizes="100vw"
                placeholder="blur"
                preload={slideIndex === 0}
                className="object-cover"
                style={{ objectPosition: slide.position }}
              />
            </div>
          </div>
        ))}

        {/* Shade: darkest behind the headline, with a warm patch of sunshine. */}
        <div className="absolute inset-0 bg-[#03241a]/50 lg:bg-[#03241a]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03241a]/80 via-[#03241a]/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#03241a]/55 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_88%_8%,rgb(255_214_102/0.32),transparent_70%)]" />
      </div>

      <div className="absolute right-4 bottom-20 z-10 flex items-center gap-2 sm:right-6 sm:bottom-24 lg:right-8 lg:bottom-28">
        <p
          key={current.id}
          className="hidden animate-rise rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur sm:block"
        >
          📍 {current.title}
        </p>
        <div className="flex items-center rounded-full bg-black/45 px-1.5 py-1 ring-1 ring-white/20 backdrop-blur">
          {SLIDES.map((slide, slideIndex) => (
            <button
              key={slide.photo.id}
              type="button"
              onClick={() => setIndex(slideIndex)}
              aria-label={`Show photo ${slideIndex + 1}: ${slide.photo.title}`}
              aria-current={slideIndex === index ? "true" : undefined}
              className="group flex h-7 items-center px-1 focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              <span
                className={cn(
                  "block h-2.5 rounded-full transition-all duration-500",
                  slideIndex === index ? "w-6 bg-amber-300" : "w-2.5 bg-white/60 group-hover:bg-white",
                )}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPlayChoice(!playing)}
            aria-label={playing ? "Pause the photo slideshow" : "Play the photo slideshow"}
            className="ml-0.5 flex size-7 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </>
  );
}
