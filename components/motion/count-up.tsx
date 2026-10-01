"use client";

import * as React from "react";

interface CountUpProps {
  value: number;
  suffix?: string;
  durationMs?: number;
}

/**
 * Counts from zero to `value` the first time the number scrolls into view.
 * The server renders the final value, and assistive technology only ever
 * hears that final value — the ticking digits are decorative.
 */
export function CountUp({ value, suffix = "", durationMs = 1600 }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = React.useState(value);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || value <= 0 || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Park the number at zero until enough of it is on screen to watch it count.
        if (entry.intersectionRatio < 0.5) {
          setDisplay(0);
          return;
        }
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: [0, 0.5] },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {display.toLocaleString("en-IN")}
        {suffix}
      </span>
      <span className="sr-only">
        {value.toLocaleString("en-IN")}
        {suffix}
      </span>
    </>
  );
}
