import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "primary" | "warm";
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: StatCardProps) {
  const body = (
    <Card
      className={cn(
        "h-full p-5 transition-colors",
        href && "hover:border-primary/40 hover:bg-accent/30",
        tone === "primary" && "border-primary/25 bg-accent/25",
        tone === "warm" && "border-warm/50 bg-[#fdf8ec]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            tone === "warm"
              ? "bg-warm/30 text-[#7a5a10]"
              : tone === "primary"
                ? "bg-primary/12 text-primary"
                : "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-heading text-3xl font-extrabold">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      {body}
    </Link>
  ) : (
    body
  );
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <h2 className="font-heading text-xl font-bold sm:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
