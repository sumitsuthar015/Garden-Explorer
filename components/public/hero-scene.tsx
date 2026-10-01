import type { CSSProperties } from "react";

/**
 * Decorative, fully CSS-animated layer over the home hero's garden photos:
 * twinkling pollen, falling leaves, two butterflies and a strip of grass and
 * flowers that bloom on load and melt into the page below — the playful touch
 * for the young explorers the site is built for.
 *
 * Everything is aria-hidden and positioned with fixed values so the server and
 * client render identical markup. Reduced-motion visitors get a still scene
 * through the global media query in globals.css.
 */

const POLLEN = [
  { left: "7%", top: "20%", size: 5, delay: 0 },
  { left: "16%", top: "56%", size: 4, delay: 1.2 },
  { left: "26%", top: "11%", size: 3, delay: 2.1 },
  { left: "34%", top: "42%", size: 5, delay: 0.6 },
  { left: "45%", top: "16%", size: 3, delay: 1.8 },
  { left: "51%", top: "62%", size: 4, delay: 2.8 },
  { left: "60%", top: "28%", size: 5, delay: 0.9 },
  { left: "69%", top: "50%", size: 3, delay: 2.4 },
  { left: "77%", top: "12%", size: 4, delay: 1.4 },
  { left: "86%", top: "38%", size: 5, delay: 0.3 },
  { left: "93%", top: "64%", size: 3, delay: 2 },
  { left: "40%", top: "74%", size: 4, delay: 3.1 },
] as const;

const FALLING_LEAVES = [
  { left: "5%", delay: -2, duration: 17, size: 22, color: "#8cc37a" },
  { left: "23%", delay: -9, duration: 21, size: 16, color: "#e7b75b" },
  { left: "43%", delay: -14, duration: 19, size: 19, color: "#6fae6a" },
  { left: "62%", delay: -5, duration: 23, size: 14, color: "#f4b1b8" },
  { left: "80%", delay: -11, duration: 18, size: 24, color: "#9fd08b" },
  { left: "94%", delay: -16, duration: 22, size: 15, color: "#e7b75b" },
] as const;

const FLOWERS = [
  { x: 176, y: 222, petal: "#f4a7bd", delay: 0.2 },
  { x: 388, y: 216, petal: "#ffffff", delay: 0.5 },
  { x: 468, y: 219, petal: "#e7b75b", delay: 0.8 },
  { x: 636, y: 223, petal: "#c9b2ff", delay: 0.35 },
  { x: 772, y: 225, petal: "#f4a7bd", delay: 0.65 },
  { x: 902, y: 222, petal: "#ffffff", delay: 0.95 },
  { x: 1012, y: 217, petal: "#f6a96b", delay: 0.45 },
  { x: 1150, y: 212, petal: "#e7b75b", delay: 0.75 },
  { x: 1292, y: 214, petal: "#f4a7bd", delay: 1.05 },
] as const;

const GRASS = [
  { x: 40, y: 232 },
  { x: 250, y: 216 },
  { x: 540, y: 221 },
  { x: 700, y: 224 },
  { x: 840, y: 226 },
  { x: 1080, y: 214 },
  { x: 1220, y: 211 },
  { x: 1390, y: 220 },
] as const;

function delay(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` };
}

export function HeroScene() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[-5] overflow-hidden">
      {/* Drifting pollen. */}
      {POLLEN.map((dot, index) => (
        <span
          key={index}
          className="absolute animate-twinkle rounded-full bg-white shadow-[0_0_10px_4px_rgb(255_221_120/0.8)]"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}

      {/* Falling leaves and petals. */}
      {FALLING_LEAVES.map((leaf, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          className="absolute top-0 animate-leaf-fall"
          style={{
            left: leaf.left,
            width: leaf.size,
            height: leaf.size,
            animationDelay: `${leaf.delay}s`,
            animationDuration: `${leaf.duration}s`,
          }}
        >
          <path d="M12 2C6.5 6 4 12 6 21c8-1.5 13-7 13.5-15C17 3 14 2 12 2Z" fill={leaf.color} />
          <path d="M7 20C9 14 12 9 17 5" stroke="rgb(0 0 0 / 0.18)" strokeWidth="1.2" fill="none" />
        </svg>
      ))}

      {/* Butterflies on long, meandering routes. */}
      <Butterfly wing="#f5c46a" spot="#fff6dc" className="[animation-delay:-4s]" />
      <Butterfly
        wing="#f4a7bd"
        spot="#ffffff"
        className="scale-75 [animation-delay:-19s] [animation-duration:38s]"
      />

      {/* Grass and flowers along the bottom edge of the photo. */}
      <svg
        viewBox="0 160 1440 100"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-20 w-full sm:h-24 lg:h-28"
      >
        <path
          d="M0 228C220 206 460 218 700 224C940 230 1180 204 1440 218V260H0Z"
          fill="#4fb85a"
        />

        {GRASS.map((tuft, index) => (
          <g key={index} transform={`translate(${tuft.x} ${tuft.y})`}>
            <g className="origin-base animate-sway" style={delay(index * 0.4)}>
              <path
                d="M0 0C1-8 3-14 7-19M5 0C6-9 7-17 5-25M10 0C10-7 12-12 17-16"
                stroke="#2e9448"
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </g>
        ))}

        {FLOWERS.map((flower, index) => (
          <g key={index} transform={`translate(${flower.x} ${flower.y})`}>
            <g className="origin-base animate-sway [animation-duration:5.5s]" style={delay(index * 0.3)}>
              <g className="origin-base animate-bloom" style={delay(0.6 + flower.delay)}>
                <path
                  d="M0 0C2-12-2-22 0-33"
                  stroke="#2e9448"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  fill="none"
                />
                <ellipse cx="4.5" cy="-15" rx="4.5" ry="2" fill="#2e9448" transform="rotate(-30 4.5 -15)" />
                {[0, 72, 144, 216, 288].map((angle) => (
                  <ellipse
                    key={angle}
                    cx="0"
                    cy="-41"
                    rx="3.6"
                    ry="6"
                    fill={flower.petal}
                    transform={`rotate(${angle} 0 -35)`}
                  />
                ))}
                <circle cx="0" cy="-35" r="3.4" fill="#f5c451" />
              </g>
            </g>
          </g>
        ))}

        {/* Soft edge that melts into the page below. */}
        <path
          d="M0 246C240 234 480 256 720 246C960 236 1200 256 1440 242V260H0Z"
          className="fill-background"
        />
      </svg>
    </div>
  );
}

function Butterfly({ wing, spot, className }: { wing: string; spot: string; className?: string }) {
  return (
    <div className={`absolute top-0 left-0 animate-flutter ${className ?? ""}`}>
      <svg viewBox="0 0 40 32" className="size-9 drop-shadow-[0_4px_6px_rgb(0_0_0/0.25)]">
        <g className="animate-flap" style={{ transformBox: "view-box", transformOrigin: "50% 50%" }}>
          <path d="M20 15C14 3 3 1 2 9c-1 7 8 9 18 7Z" fill={wing} />
          <path d="M20 17c-8 1-15 7-12 12 3 3 10-3 12-11Z" fill={wing} opacity="0.85" />
          <path d="M20 15c6-12 17-14 18-6 1 7-8 9-18 7Z" fill={wing} />
          <path d="M20 17c8 1 15 7 12 12-3 3-10-3-12-11Z" fill={wing} opacity="0.85" />
          <circle cx="8" cy="9" r="2.2" fill={spot} opacity="0.75" />
          <circle cx="32" cy="9" r="2.2" fill={spot} opacity="0.75" />
        </g>
        <ellipse cx="20" cy="17" rx="1.5" ry="7" fill="#2b1d0e" />
        <path d="M19.5 10Q17 5 15 4M20.5 10Q23 5 25 4" stroke="#2b1d0e" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}
