"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { GALLERY_PHOTOS, type GardenPhoto } from "@/lib/garden-photos";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

/* Bento layout: a big tile, a tall tile, then a wide one, packed densely. */
const TILE_SPAN = ["col-span-2 row-span-2", "row-span-2", "", "", "col-span-2", "", ""] as const;
const TILE_SIZES = [
  "(max-width: 1024px) 100vw, 50vw",
  "(max-width: 1024px) 50vw, 25vw",
  "(max-width: 1024px) 50vw, 25vw",
  "(max-width: 1024px) 50vw, 25vw",
  "(max-width: 1024px) 100vw, 50vw",
  "(max-width: 1024px) 50vw, 25vw",
  "(max-width: 1024px) 50vw, 25vw",
] as const;

/**
 * Real photos of the garden as a playful bento grid. Any tile opens a
 * lightbox that can be swiped, arrowed through or jumped around by thumbnail.
 */
export function GardenGallery({ photos = GALLERY_PHOTOS }: { photos?: GardenPhoto[] }) {
  const [open, setOpen] = React.useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-flow-dense auto-rows-[9.5rem] grid-cols-2 gap-3 sm:auto-rows-[11rem] sm:gap-4 lg:auto-rows-[12.5rem] lg:grid-cols-4">
        {photos.map((photo, index) => {
          const big = index === 0;
          return (
            <Reveal
              as="li"
              key={photo.id}
              from="scale"
              delay={(index % 4) * 90}
              className={cn("relative", TILE_SPAN[index] ?? "")}
            >
              <button
                type="button"
                onClick={() => {
                  playSound("pop");
                  setOpen(index);
                }}
                aria-label={`Look closer: ${photo.title}`}
                className="group relative block size-full overflow-hidden rounded-[1.75rem] bg-emerald-100 shadow-soft ring-1 ring-black/5 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:rotate-[-0.5deg] hover:shadow-lift focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                <span className={cn("absolute inset-0", big && "animate-ken-burns")}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    placeholder="blur"
                    sizes={TILE_SIZES[index] ?? "50vw"}
                    className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                  />
                </span>

                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/35 opacity-0 blur-md group-hover:animate-sweep group-hover:opacity-100"
                />

                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-3 left-3 flex animate-bob items-center justify-center rounded-2xl bg-white/90 shadow-lift ring-2 ring-white",
                    big ? "size-12 text-2xl" : "size-10 text-xl",
                  )}
                  style={{ animationDelay: `${index * 0.35}s` }}
                >
                  {photo.emoji}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute top-3 right-3 flex size-9 scale-75 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-[opacity,transform] duration-300 group-hover:scale-100 group-hover:opacity-100"
                >
                  <Expand className="size-4" />
                </span>

                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3 text-left text-white sm:p-4">
                  <span
                    className={cn(
                      "font-heading leading-tight font-bold drop-shadow",
                      big ? "text-xl sm:text-2xl" : "text-sm sm:text-base",
                    )}
                  >
                    {photo.title}
                  </span>
                  {big ? (
                    <span className="hidden max-w-md text-sm leading-relaxed text-white/90 sm:block">
                      {photo.caption}
                    </span>
                  ) : null}
                </span>
              </button>
            </Reveal>
          );
        })}
      </ul>

      <PhotoLightbox photos={photos} index={open} onIndexChange={setOpen} />
    </>
  );
}

function PhotoLightbox({
  photos,
  index,
  onIndexChange,
}: {
  photos: GardenPhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const swipeStart = React.useRef<number | null>(null);
  const photo = index === null ? null : photos[index];

  const step = React.useCallback(
    (delta: number) => {
      if (index === null) return;
      playSound("pop");
      onIndexChange((index + delta + photos.length) % photos.length);
    },
    [index, onIndexChange, photos.length],
  );

  return (
    <Dialog open={photo !== null} onOpenChange={(next) => {
        if (!next) onIndexChange(null);
      }}>
      {photo ? (
        <DialogContent
          showCloseButton={false}
          className="max-w-5xl gap-0 overflow-hidden rounded-[1.75rem] border-0 bg-[#10201a] p-0 text-white sm:p-0"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
          }}
        >
          <div
            className="relative h-[52dvh] w-full touch-pan-y bg-black sm:h-[64dvh]"
            onPointerDown={(event) => {
              swipeStart.current = event.clientX;
            }}
            onPointerUp={(event) => {
              if (swipeStart.current === null) return;
              const dx = event.clientX - swipeStart.current;
              swipeStart.current = null;
              if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            }}
          >
            <Image
              key={photo.id}
              src={photo.src}
              alt={photo.alt}
              fill
              placeholder="blur"
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="animate-pop object-contain"
            />

            <span className="absolute top-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold backdrop-blur">
              {(index ?? 0) + 1} / {photos.length}
            </span>
            <DialogClose
              className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lift transition-transform hover:scale-110 focus-visible:outline-4 focus-visible:outline-amber-400"
              aria-label="Close photo"
            >
              <X className="size-5" />
            </DialogClose>

            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lift transition-transform hover:scale-110 focus-visible:outline-4 focus-visible:outline-amber-400"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lift transition-transform hover:scale-110 focus-visible:outline-4 focus-visible:outline-amber-400"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            ) : null}
          </div>

          <div key={photo.id} className="flex animate-rise flex-col gap-1.5 px-5 pt-4 pb-3 sm:px-6">
            <DialogTitle className="flex items-center gap-2 font-heading text-xl font-bold text-white">
              <span aria-hidden="true">{photo.emoji}</span>
              {photo.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-white/80">
              {photo.caption}
            </DialogDescription>
          </div>

          <div className="flex gap-2 overflow-x-auto px-5 pb-5 sm:px-6">
            {photos.map((thumb, thumbIndex) => (
              <button
                key={thumb.id}
                type="button"
                onClick={() => onIndexChange(thumbIndex)}
                aria-label={`Show ${thumb.title}`}
                aria-current={thumbIndex === index ? "true" : undefined}
                className={cn(
                  "relative h-12 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition-[transform,opacity] duration-300 focus-visible:outline-4 focus-visible:outline-amber-400",
                  thumbIndex === index ? "scale-105 ring-amber-400" : "opacity-60 ring-transparent hover:opacity-100",
                )}
              >
                <Image src={thumb.src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
