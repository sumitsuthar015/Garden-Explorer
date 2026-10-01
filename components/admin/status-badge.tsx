import Link from "next/link";

import { PUBLISH_STATUS_LABELS, type PublishStatus, type QrStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: PublishStatus }) {
  const variant =
    status === "published" ? "success" : status === "draft" ? "warning" : "muted";
  return <Badge variant={variant}>{PUBLISH_STATUS_LABELS[status]}</Badge>;
}

export function QrStatusBadge({ status }: { status: QrStatus }) {
  return (
    <Badge variant={status === "active" ? "success" : "muted"}>
      {status === "active" ? "Active" : "Disabled"}
    </Badge>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

interface AdminFilterBarProps {
  action: string;
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  filters?: {
    name: string;
    label: string;
    value: string;
    options: FilterOption[];
  }[];
  sortOptions?: FilterOption[];
  sortName?: string;
  sortValue?: string;
  children?: React.ReactNode;
}

/**
 * GET-based filter bar.
 *
 * Filters live in the URL so results are bookmarkable, the back button works,
 * and server-side pagination can preserve them — no client-side fetch layer.
 */
export function AdminFilterBar({
  action,
  searchName = "search",
  searchValue = "",
  searchPlaceholder = "Search…",
  filters = [],
  sortOptions,
  sortName = "sort",
  sortValue = "",
  children,
}: AdminFilterBarProps) {
  return (
    <form action={action} method="get" className="flex flex-col gap-3 pb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="admin-search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <input
            id="admin-search"
            type="search"
            name={searchName}
            defaultValue={searchValue}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-[inset_0_1px_1px_rgb(31_41_51/0.03)] focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring/60"
          />
        </div>

        {filters.map((filter) => (
          <div key={filter.name} className="flex flex-col gap-1.5">
            <label htmlFor={`filter-${filter.name}`} className="text-xs font-medium text-muted-foreground">
              {filter.label}
            </label>
            <select
              id={`filter-${filter.name}`}
              name={filter.name}
              defaultValue={filter.value}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring/60"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {sortOptions ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`filter-${sortName}`} className="text-xs font-medium text-muted-foreground">
              Sort by
            </label>
            <select
              id={`filter-${sortName}`}
              name={sortName}
              defaultValue={sortValue}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring/60"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button
          type="submit"
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[#2a6047] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Apply
        </button>

        <Link
          href={action}
          className={cn(
            "inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent/50",
          )}
        >
          Reset
        </Link>
      </div>

      {children}
    </form>
  );
}
