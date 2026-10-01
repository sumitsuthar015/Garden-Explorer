import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Pip — the garden's robot sprout and the kids' guide.
 *
 * Half seedling (science), half robot with an antenna (coding), Pip reacts to
 * what the young visitor does: waving hello, cheering a right answer, thinking
 * along with a wrong one. Pure SVG + CSS animation, so it renders on the server
 * and freezes politely for reduced-motion visitors.
 */

export type MascotMood = "happy" | "wave" | "cheer" | "think" | "oops";

const BODY_ANIMATION: Record<MascotMood, string> = {
  happy: "animate-bob",
  wave: "animate-bob",
  cheer: "animate-jump",
  think: "animate-tilt",
  oops: "animate-shake [animation-iteration-count:2]",
};

interface MascotProps {
  mood?: MascotMood;
  className?: string;
  /** Give Pip an accessible name when it carries meaning; decorative otherwise. */
  label?: string;
}

export function Mascot({ mood = "happy", className, label }: MascotProps) {
  const armsUp = mood === "cheer";
  const pupilShift = mood === "think" ? "translate(3 -4)" : "";

  return (
    <svg
      viewBox="0 0 160 190"
      className={cn("h-auto w-32 overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <ellipse cx="80" cy="182" rx="40" ry="6" fill="rgb(0 0 0 / 0.12)" />

      <g className={cn("origin-base", BODY_ANIMATION[mood])}>
        {/* Sprout leaves and antenna. */}
        <g className="origin-base animate-sway [animation-duration:3.5s]">
          <path d="M77 50C58 46 45 31 47 17c15 1 28 13 30 33Z" fill="#4ade80" />
          <path d="M83 50c19-4 32-19 30-33-15 1-28 13-30 33Z" fill="#22c55e" />
          <path d="M80 50V24" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="20" r="7" fill="#fbbf24" className="origin-center-box animate-twinkle [animation-duration:2.4s]" />
          <circle cx="78" cy="18" r="2.2" fill="#fff7d6" />
        </g>

        {/* Arms sit behind the body. */}
        <g fill="#34b35a">
          {armsUp ? (
            <>
              <ellipse cx="30" cy="84" rx="9" ry="17" transform="rotate(-30 30 84)" />
              <ellipse cx="130" cy="84" rx="9" ry="17" transform="rotate(30 130 84)" />
            </>
          ) : (
            <>
              <ellipse cx="28" cy="122" rx="9" ry="16" transform="rotate(30 28 122)" />
              {mood === "wave" ? (
                <g style={{ transformOrigin: "126px 112px" }} className="animate-wave-hand">
                  <ellipse cx="126" cy="130" rx="9" ry="17" />
                </g>
              ) : mood === "think" ? (
                // Hand on chin.
                <ellipse cx="104" cy="136" rx="9" ry="15" transform="rotate(-60 104 136)" />
              ) : (
                <ellipse cx="132" cy="122" rx="9" ry="16" transform="rotate(-30 132 122)" />
              )}
            </>
          )}
        </g>

        {/* Body and belly. */}
        <path
          d="M80 48c38 0 54 32 52 66-2 36-24 58-52 58s-50-22-52-58c-2-34 14-66 52-66Z"
          fill="#4cc975"
        />
        <path d="M52 70c8-10 20-15 32-15" stroke="#8ff0b4" strokeWidth="6" strokeLinecap="round" fill="none" />
        <ellipse cx="80" cy="134" rx="31" ry="27" fill="#dcfce7" />
        <path d="M68 132h24M72 142h16" stroke="#86efac" strokeWidth="3" strokeLinecap="round" />

        {/* Eyes blink every few seconds. */}
        <g className="origin-center-box animate-blink">
          <ellipse cx="63" cy="96" rx="12" ry="13" fill="#ffffff" />
          <ellipse cx="97" cy="96" rx="12" ry="13" fill="#ffffff" />
          <g transform={pupilShift}>
            <circle cx="65" cy="98" r="6.5" fill="#1f2937" />
            <circle cx="99" cy="98" r="6.5" fill="#1f2937" />
            <circle cx="67.5" cy="95" r="2.2" fill="#ffffff" />
            <circle cx="101.5" cy="95" r="2.2" fill="#ffffff" />
          </g>
        </g>

        <ellipse cx="49" cy="114" rx="7" ry="4.5" fill="#fb7185" opacity="0.55" />
        <ellipse cx="111" cy="114" rx="7" ry="4.5" fill="#fb7185" opacity="0.55" />

        <Mouth mood={mood} />

        {/* Feet. */}
        <ellipse cx="64" cy="172" rx="13" ry="7" fill="#15803d" />
        <ellipse cx="96" cy="172" rx="13" ry="7" fill="#15803d" />
      </g>

      {mood === "think" ? (
        <g className="animate-bob [animation-duration:2s]">
          <circle cx="136" cy="40" r="14" fill="#ffffff" stroke="#e5e7eb" strokeWidth="2" />
          <text x="136" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill="#8b5cf6">
            ?
          </text>
          <circle cx="122" cy="60" r="4" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
        </g>
      ) : null}

      {mood === "cheer" ? (
        <g fill="#fbbf24">
          <Sparkle x={18} y={40} delay={0} />
          <Sparkle x={142} y={30} delay={0.5} />
          <Sparkle x={150} y={100} delay={1} />
          <Sparkle x={8} y={110} delay={1.4} />
        </g>
      ) : null}

    </svg>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  if (mood === "cheer") {
    return (
      <g>
        <path d="M64 112q16 26 32 0Z" fill="#7f1d1d" />
        <ellipse cx="80" cy="121" rx="7" ry="4" fill="#fb7185" />
      </g>
    );
  }
  if (mood === "think") return <circle cx="86" cy="118" r="4.5" fill="#1f2937" />;
  if (mood === "oops") {
    return (
      <path
        d="M66 120q3.5-5 7 0t7 0 7 0 7 0"
        stroke="#1f2937"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <path d="M67 113q13 14 26 0" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" fill="none" />
  );
}

function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <path
      d={`M${x} ${y - 8}l2.2 5.8 5.8 2.2-5.8 2.2-2.2 5.8-2.2-5.8-5.8-2.2 5.8-2.2Z`}
      className="origin-center-box animate-twinkle [animation-duration:1.6s]"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/** Pip with a speech bubble — the bubble text is real text, read by screen readers. */
export function MascotSays({
  mood = "happy",
  children,
  side = "right",
  className,
  mascotClassName,
}: {
  mood?: MascotMood;
  children: ReactNode;
  side?: "right" | "top";
  className?: string;
  mascotClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-3",
        side === "top" && "flex-col-reverse items-center gap-2",
        className,
      )}
    >
      <Mascot mood={mood} className={cn("w-20 shrink-0 sm:w-24", mascotClassName)} />
      <div
        className={cn(
          "relative animate-bounce-in rounded-2xl border-2 border-[#c7f0d2] bg-white px-4 py-3 text-sm leading-relaxed font-medium text-foreground shadow-soft [animation-delay:200ms] sm:text-base",
          side === "right" ? "mb-6" : "text-center",
        )}
      >
        {children}
        <span
          aria-hidden="true"
          className={cn(
            "absolute size-3.5 rotate-45 border-[#c7f0d2] bg-white",
            side === "right"
              ? "bottom-4 -left-[9px] border-b-2 border-l-2"
              : "-bottom-[9px] left-1/2 -translate-x-1/2 border-r-2 border-b-2",
          )}
        />
      </div>
    </div>
  );
}
