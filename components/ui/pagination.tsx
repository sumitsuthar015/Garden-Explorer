"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Path of the list route, e.g. `/admin/locations`. */
  basePath: string;
  /**
   * Filters to carry over to the page links. Plain data on purpose: this is a
   * client component, so server pages may not pass callbacks to it.
   * `page` is appended automatically.
   */
  params?: Record<string, string>;
  className?: string;
}

/** Server-driven pagination — never fetches every row to render one page. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const buildHref = (target: number) => {
    const search = new URLSearchParams(params);
    search.set("page", String(target));
    return `${basePath}?${search.toString()}`;
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const prevHref = page > 1 ? buildHref(page - 1) : null;
  const nextHref = page < totalPages ? buildHref(page + 1) : null;

  const linkClass = cn(buttonVariants({ variant: "outline", size: "sm" }));

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3 pt-1", className)}
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{first}</span>–
        <span className="font-medium text-foreground">{last}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link href={prevHref} className={linkClass} rel="prev">
            <ChevronLeft />
            Previous
          </Link>
        ) : (
          <span className={cn(linkClass, "pointer-events-none opacity-50")} aria-disabled="true">
            <ChevronLeft />
            Previous
          </span>
        )}
        <span className="px-1 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        {nextHref ? (
          <Link href={nextHref} className={linkClass} rel="next">
            Next
            <ChevronRight />
          </Link>
        ) : (
          <span className={cn(linkClass, "pointer-events-none opacity-50")} aria-disabled="true">
            Next
            <ChevronRight />
          </span>
        )}
      </div>
    </nav>
  );
}
