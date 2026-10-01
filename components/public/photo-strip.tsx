import Image from "next/image";

import { GALLERY_PHOTOS, type GardenPhoto } from "@/lib/garden-photos";
import { cn } from "@/lib/utils";

const TILTS = ["-3deg", "2deg", "-1.5deg", "2.5deg", "-2.5deg", "1.5deg", "-2deg"] as const;

/**
 * An endless strip of polaroids drifting sideways. The second copy exists only
 * so the loop is seamless, so it is hidden from screen readers. Hovering pauses
 * it; reduced-motion visitors see a still row.
 */
export function PhotoStrip({
  photos = GALLERY_PHOTOS,
  className,
}: {
  photos?: GardenPhoto[];
  className?: string;
}) {
  return (
    <div className={cn("pause-on-hover relative overflow-hidden py-8", className)}>
      <div className="flex w-max animate-filmstrip">
        {[0, 1].map((half) => (
          <ul key={half} aria-hidden={half === 1 || undefined} className="flex shrink-0 gap-6 pr-6">
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                className="w-48 shrink-0 rounded-xl bg-white p-2 pb-3 shadow-lift ring-1 ring-black/5 transition-transform duration-300 hover:scale-105 sm:w-60"
                style={{ rotate: TILTS[index % TILTS.length] }}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-emerald-100">
                  <Image
                    src={photo.src}
                    alt={half === 0 ? photo.alt : ""}
                    fill
                    placeholder="blur"
                    sizes="240px"
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 text-center font-heading text-sm font-bold text-slate-700">
                  <span aria-hidden="true">{photo.emoji}</span> {photo.title}
                </p>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent sm:w-20"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:w-20"
      />
    </div>
  );
}
