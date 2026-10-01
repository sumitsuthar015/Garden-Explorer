"use client";

import * as React from "react";
import { ExternalLink, MapPinned } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GARDEN_LOCATION } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Map of the garden's location.
 *
 * Starts as an illustrated preview so no request reaches Google until the
 * visitor asks for the interactive map — which keeps the privacy page true.
 */
export function GardenMap({ className }: { className?: string }) {
  const [interactive, setInteractive] = React.useState(false);

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-3xl border border-border bg-[#eef3e8] shadow-lift sm:aspect-[4/3]",
        className,
      )}
    >
      {interactive ? (
        <iframe
          src={GARDEN_LOCATION.embedUrl}
          title={`Google Map showing ${GARDEN_LOCATION.name}`}
          className="absolute inset-0 size-full animate-fade-in border-0"
          loading="lazy"
          allowFullScreen
        />
      ) : (
        <>
          <MapIllustration />

          <div className="absolute top-[16%] left-1/2 -translate-x-1/2 animate-rise [animation-delay:600ms]">
            <p className="rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-center text-xs font-semibold whitespace-nowrap text-foreground shadow-soft backdrop-blur sm:text-sm">
              {GARDEN_LOCATION.name}
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 bg-gradient-to-t from-[#0d271d]/80 via-[#0d271d]/45 to-transparent p-4 pt-14 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pt-16">
            <Button onClick={() => setInteractive(true)} className="shadow-lift">
              <MapPinned aria-hidden="true" />
              Show interactive map
            </Button>
            <a
              href={GARDEN_LOCATION.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 underline-offset-4 hover:text-white hover:underline sm:text-sm"
            >
              Open in Google Maps
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

/** A stylised street plan — not to scale — with the garden at its centre. */
function MapIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 480 360"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <rect width="480" height="360" fill="#eef3e8" />

      {/* City blocks. */}
      {[
        [18, 18, 110, 70],
        [18, 110, 96, 88],
        [330, 20, 132, 64],
        [352, 108, 110, 70],
        [22, 262, 104, 80],
        [300, 268, 160, 76],
        [180, 24, 110, 46],
        [190, 288, 80, 56],
      ].map(([x, y, w, h], index) => (
        <rect key={index} x={x} y={y} width={w} height={h} rx="10" fill="#dfe7d8" />
      ))}

      {/* Roads: a soft outline under a white carriageway. */}
      <g fill="none" strokeLinecap="round">
        <g stroke="#d3dccb" strokeWidth="22">
          <path d="M-10 238C120 228 260 252 490 226" />
          <path d="M150-10C164 120 138 236 172 370" />
          <path d="M318-10C328 90 360 250 346 370" />
          <path d="M-10 92C120 100 320 84 490 98" />
        </g>
        <g stroke="#ffffff" strokeWidth="16">
          <path d="M-10 238C120 228 260 252 490 226" />
          <path d="M150-10C164 120 138 236 172 370" />
          <path d="M318-10C328 90 360 250 346 370" />
          <path d="M-10 92C120 100 320 84 490 98" />
        </g>
        <path
          d="M-10 238C120 228 260 252 490 226"
          stroke="#f3d48a"
          strokeWidth="2"
          strokeDasharray="10 10"
        />
      </g>

      {/* The garden. */}
      <path
        d="M178 118C214 106 272 108 300 122C318 150 314 196 296 214C258 224 208 222 184 208C170 180 166 142 178 118Z"
        fill="#bcdcae"
        stroke="#99c887"
        strokeWidth="3"
      />
      <path
        d="M196 196C214 168 236 186 250 164S286 150 290 132"
        fill="none"
        stroke="#e9dfc2"
        strokeWidth="5"
        strokeLinecap="round"
        pathLength="1"
        className="stroke-draw animate-draw"
      />
      {[
        [198, 136, 11],
        [222, 128, 8],
        [282, 186, 12],
        [206, 176, 8],
        [296, 150, 7],
        [262, 204, 8],
      ].map(([cx, cy, r], index) => (
        <circle
          key={index}
          cx={cx}
          cy={cy}
          r={r}
          fill={index % 2 === 0 ? "#6fae63" : "#83bd72"}
          className="origin-center-box animate-bloom"
          style={{ animationDelay: `${0.2 + index * 0.12}s` }}
        />
      ))}

      {/* Area labels. */}
      <text
        x="408"
        y="232"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        letterSpacing="3"
        fill="#8a9a8f"
      >
        BANDRA EAST
      </text>
      <text x="74" y="84" textAnchor="middle" fontSize="9" letterSpacing="1.5" fill="#9aa89e">
        GOVT. COLONY
      </text>

      {/* Compass. */}
      <g transform="translate(446 322)">
        <circle r="15" fill="#ffffff" stroke="#d3dccb" />
        <path d="M0-10 4 2H-4Z" fill="#e0533d" />
        <path d="M0 10 4-2H-4Z" fill="#b8c4b6" />
        <text y="-19" textAnchor="middle" fontSize="8" fontWeight="700" fill="#5b6a62">
          N
        </text>
      </g>

      {/* Pin with a ripple where it lands. */}
      <g transform="translate(243 166)">
        <ellipse
          rx="20"
          ry="7"
          fill="none"
          stroke="#e0533d"
          strokeWidth="2"
          className="origin-center-box animate-ring-pulse"
        />
        <ellipse rx="7" ry="2.6" fill="rgb(0 0 0 / 0.22)" />
        <g className="animate-pin-bounce">
          <path
            d="M0 0C-4-12-17-20-17-33a17 17 0 0 1 34 0C17-20 4-12 0 0Z"
            fill="#e0533d"
            stroke="#b8392a"
            strokeWidth="1.5"
          />
          <circle cy="-33" r="6.5" fill="#ffffff" />
        </g>
      </g>
    </svg>
  );
}
