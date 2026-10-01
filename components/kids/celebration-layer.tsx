"use client";

import * as React from "react";

import { onCelebrate, type CelebrationSize } from "@/lib/celebrate";

const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c"];

interface Piece {
  left: number;
  style: React.CSSProperties;
  shape: "strip" | "dot";
}

interface Burst {
  id: number;
  pieces: Piece[];
}

function makePieces(size: CelebrationSize): Piece[] {
  const count = size === "big" ? 110 : 45;
  return Array.from({ length: count }, () => {
    const spread = size === "big" ? 70 : 45;
    return {
      left: 50 + (Math.random() - 0.5) * 30,
      shape: Math.random() < 0.3 ? "dot" : "strip",
      style: {
        "--dx": `${(Math.random() - 0.5) * spread * 2}vw`,
        "--rise": `${-(18 + Math.random() * 28)}vh`,
        "--spin": `${(Math.random() - 0.5) * 1440}deg`,
        "--size": `${7 + Math.random() * 7}px`,
        "--color": COLORS[Math.floor(Math.random() * COLORS.length)],
        "--duration": `${1.8 + Math.random() * 1.4}s`,
        "--delay": `${Math.random() * 0.15}s`,
      } as React.CSSProperties,
    };
  });
}

/**
 * Draws confetti whenever anything calls `celebrate()`. Mounted once in the
 * public layout. Visitors who prefer reduced motion get no confetti at all.
 */
export function CelebrationLayer() {
  const [bursts, setBursts] = React.useState<Burst[]>([]);

  React.useEffect(() => {
    const timers = new Set<number>();
    const unsubscribe = onCelebrate((size) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const id = Date.now() + Math.random();
      setBursts((previous) => [...previous.slice(-2), { id, pieces: makePieces(size) }]);
      const timer = window.setTimeout(() => {
        setBursts((previous) => previous.filter((burst) => burst.id !== id));
        timers.delete(timer);
      }, 3600);
      timers.add(timer);
    });
    return () => {
      unsubscribe();
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);

  if (bursts.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {bursts.map((burst) =>
        burst.pieces.map((piece, index) => (
          <span
            key={`${burst.id}-${index}`}
            className="confetti-piece"
            data-shape={piece.shape}
            style={{ left: `${piece.left}%`, ...piece.style }}
          />
        )),
      )}
    </div>
  );
}
