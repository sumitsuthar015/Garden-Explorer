import type { CSSProperties } from "react";

import { Mascot } from "@/components/kids/mascot";
import { escapeSvgText } from "@/lib/qr/generate";

interface QrPosterProps {
  siteTitle: string;
  locationName: string;
  publicCode: string;
  /** Inline data URL generated server-side. */
  dataUrl: string;
  targetUrl: string;
  shortDescription?: string | null;
  trailName?: string | null;
  /** The place's emoji, shown big so young visitors recognise the stop. */
  icon?: string | null;
  /** "full" fills the sheet, "sheet" is a smaller multi-per-page card. */
  variant?: "full" | "sheet";
}

/** Keep the colours when printing — browsers drop backgrounds by default. */
const PRINT_COLOURS: CSSProperties = {
  breakInside: "avoid",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
};

const STEPS = ["Open your camera", "Point at the square", "Learn, play & earn XP!"] as const;

/**
 * Print-ready QR sign, designed to catch a child's eye.
 *
 * Print reliability choices:
 *  - the QR itself stays pure black on pure white with its 4-module quiet zone
 *  - colour only frames the code, it never touches it
 *  - the code is printed in plain text so a visitor can type it if the camera
 *    fails, and so a human can tell which sign this is
 *  - `break-inside: avoid` keeps a sheet card from being split across pages
 */
export function QrPoster({
  siteTitle,
  locationName,
  publicCode,
  dataUrl,
  targetUrl,
  shortDescription,
  trailName,
  icon,
  variant = "full",
}: QrPosterProps) {
  if (variant === "sheet") {
    return (
      <article
        className="flex break-inside-avoid flex-col items-center gap-2 rounded-3xl border-4 border-[#4cc975] bg-white p-5 text-center"
        style={PRINT_COLOURS}
      >
        <p className="rounded-full bg-[#dcfce7] px-3 py-0.5 text-[0.65rem] font-bold tracking-[0.18em] text-[#15803d] uppercase">
          {siteTitle}
        </p>
        <h1 className="flex items-center gap-2 font-heading text-xl leading-tight font-bold text-black">
          {icon ? <span aria-hidden="true">{icon}</span> : null}
          {locationName}
        </h1>
        <p className="rounded-full bg-[#fbbf24] px-3 py-0.5 font-heading text-sm font-bold text-[#422006]">
          Scan me! 📱
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- a data URL must not be optimised or re-encoded */}
        <img
          src={dataUrl}
          alt={`QR code for ${locationName}`}
          width={180}
          height={180}
          className="block"
          style={{ imageRendering: "pixelated" }}
        />
        <p className="text-[0.7rem] text-[#4b5450]">Point your phone camera at the square.</p>
        <p className="font-mono text-[0.7rem] tracking-widest text-black">{escapeSvgText(publicCode)}</p>
      </article>
    );
  }

  return (
    <article
      className="flex flex-col items-center gap-5 overflow-hidden rounded-[2rem] border-[10px] border-[#4cc975] bg-white px-8 pt-8 pb-7 text-center"
      style={PRINT_COLOURS}
    >
      <header className="flex flex-col items-center gap-2">
        <p className="rounded-full bg-[#dcfce7] px-4 py-1 text-sm font-bold tracking-[0.2em] text-[#15803d] uppercase">
          {siteTitle}
        </p>
        {icon ? (
          <span aria-hidden="true" className="text-6xl leading-none">
            {icon}
          </span>
        ) : null}
        <h1 className="font-heading text-5xl leading-tight font-bold text-black">{locationName}</h1>
        {trailName ? (
          <p className="text-base font-medium text-[#4b5450]">Part of the {trailName} trail</p>
        ) : null}
      </header>

      <div className="flex items-end gap-2">
        <Mascot mood="wave" className="w-28 shrink-0" />
        <div className="flex flex-col items-center gap-2">
          <p className="rounded-full bg-[#fbbf24] px-5 py-1.5 font-heading text-2xl font-bold text-[#422006]">
            Scan me! 📱
          </p>
          <div className="rounded-3xl border-4 border-dashed border-[#86efac] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL must not be optimised or re-encoded */}
            <img
              src={dataUrl}
              alt={`QR code for ${locationName}`}
              width={340}
              height={340}
              className="block"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>
      </div>

      <ol className="flex flex-wrap justify-center gap-3">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-2 rounded-full bg-[#f0f9ff] px-3 py-1.5 text-sm font-semibold text-[#0c4a6e]"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-[#0ea5e9] text-xs font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {shortDescription ? (
        <p className="max-w-md text-base leading-relaxed text-[#374151]">{shortDescription}</p>
      ) : null}

      <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-[#6b736e]">No camera? Open the Scan page and type this code:</p>
        <p className="font-mono text-xl font-bold tracking-[0.2em] text-black">
          {escapeSvgText(publicCode)}
        </p>
        <p className="max-w-md text-xs break-all text-[#6b736e]">{targetUrl}</p>
      </div>
    </article>
  );
}
