import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2" | "h3";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
  as: Heading = "h2",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-2", align === "center" && "items-center")}>
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            <span aria-hidden="true" className="h-px w-6 rounded-full bg-gradient-to-r from-transparent to-primary" />
            {eyebrow}
            {align === "center" ? (
              <span aria-hidden="true" className="h-px w-6 rounded-full bg-gradient-to-l from-transparent to-primary" />
            ) : null}
          </p>
        ) : null}
        <Heading
          className={cn(
            "font-heading font-bold text-balance",
            Heading === "h1"
              ? "text-3xl leading-tight sm:text-4xl lg:text-5xl"
              : "text-2xl leading-tight sm:text-3xl",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p
            className={cn(
              "max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base",
              align === "center" && "mx-auto",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
