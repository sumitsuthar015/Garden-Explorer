"use client";

import * as React from "react";

type RevealTag = "div" | "li" | "section" | "article";

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: RevealTag;
  /** Stagger offset in milliseconds, applied when the element scrolls into view. */
  delay?: number;
  from?: "up" | "left" | "right" | "scale";
}

let sharedObserver: IntersectionObserver | null = null;

/** One observer for every revealed element on the page. */
function getObserver(): IntersectionObserver {
  sharedObserver ??= new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.reveal = "shown";
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
  );
  return sharedObserver;
}

/**
 * Fades and lifts its children in the first time they scroll into view.
 *
 * Server-rendered markup is fully visible. After hydration only elements that
 * are still below the fold are hidden, so nothing flickers, content survives a
 * failed script, and reduced-motion visitors are never made to wait.
 */
export function Reveal({
  as = "div",
  delay = 0,
  from = "up",
  style,
  children,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;

  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    node.dataset.reveal = "hidden";
    const observer = getObserver();
    observer.observe(node);
    return () => observer.unobserve(node);
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal-from={from}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}
