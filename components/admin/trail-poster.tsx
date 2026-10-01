import type { CSSProperties } from "react";

import { Mascot } from "@/components/kids/mascot";

interface TrailPosterProps {
  siteTitle: string;
  gardenName: string;
  trailName: string;
  icon: string | null;
  description: string;
  stops: { position: number; name: string }[];
  minutes: number;
  ageLabel: string;
  /** Inline data URL generated server-side. */
  dataUrl: string;
  targetUrl: string;
}

const PRINT_COLOURS: CSSProperties = {
  breakInside: "avoid",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
};

/**
 * "Start here" poster for a whole trail, meant for the garden gate. Scanning it
 * opens the trail's adventure map, which lists every stop and its clue.
 */
export function TrailPoster({
  siteTitle,
  gardenName,
  trailName,
  icon,
  description,
  stops,
  minutes,
  ageLabel,
  dataUrl,
  targetUrl,
}: TrailPosterProps) {
  return (
    <article
      className="flex flex-col items-center gap-5 overflow-hidden rounded-[2rem] border-[10px] border-[#8b5cf6] bg-white px-8 pt-8 pb-7 text-center"
      style={PRINT_COLOURS}
    >
      <header className="flex flex-col items-center gap-2">
        <p className="rounded-full bg-[#ede9fe] px-4 py-1 text-sm font-bold tracking-[0.2em] text-[#6d28d9] uppercase">
          {siteTitle} · Start here
        </p>
        <span aria-hidden="true" className="text-6xl leading-none">
          {icon ?? "🥾"}
        </span>
        <h1 className="font-heading text-5xl leading-tight font-bold text-black">{trailName}</h1>
        <p className="max-w-lg text-base leading-relaxed text-[#374151]">{description}</p>
        <p className="text-sm font-semibold text-[#6d28d9]">
          {stops.length} stops · about {minutes} min · {ageLabel}
        </p>
      </header>

      <div className="flex items-end gap-2">
        <Mascot mood="cheer" className="w-28 shrink-0" />
        <div className="flex flex-col items-center gap-2">
          <p className="rounded-full bg-[#fbbf24] px-5 py-1.5 font-heading text-2xl font-bold text-[#422006]">
            Scan to start the adventure! 📱
          </p>
          <div className="rounded-3xl border-4 border-dashed border-[#c4b5fd] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL must not be optimised or re-encoded */}
            <img
              src={dataUrl}
              alt={`QR code to start the ${trailName} trail`}
              width={320}
              height={320}
              className="block"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>
      </div>

      <ol className="flex flex-wrap justify-center gap-2">
        {stops.map((stop) => (
          <li
            key={stop.position}
            className="flex items-center gap-2 rounded-full bg-[#f5f3ff] px-3 py-1.5 text-sm font-semibold text-[#4c1d95]"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-[#8b5cf6] text-xs font-bold text-white">
              {stop.position}
            </span>
            {stop.name}
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-[#4b5450]">
          Find each stop&apos;s Garden Explorer sign in {gardenName}, scan it and collect XP and
          badges!
        </p>
        <p className="max-w-md text-xs break-all text-[#6b736e]">{targetUrl}</p>
      </div>
    </article>
  );
}
