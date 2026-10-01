import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ListChecks } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/stat-card";
import { AdminFilterBar, StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { listActivitiesAdmin, listContentBlocksAdmin, listLocationOptions } from "@/db/queries/locations";
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  CONTENT_BLOCK_LABELS,
  CONTENT_BLOCK_TYPES,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
  type ActivityType,
  type ContentBlockType,
  type PublishStatus,
} from "@/lib/constants";
import { paginationSchema } from "@/lib/validation/common";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminContentPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") flat[key] = value[0];
  }

  const view = flat.view === "activities" ? "activities" : "cards";
  const pagination = paginationSchema.parse(flat);
  const status = (PUBLISH_STATUSES as readonly string[]).includes(flat.status ?? "")
    ? (flat.status as PublishStatus)
    : "all";
  const locationId = flat.locationId ?? "";
  const type = flat.type ?? "all";

  const garden = await ensurePrimaryGarden();
  const locations = await listLocationOptions(garden.id);

  const cardType = (CONTENT_BLOCK_TYPES as readonly string[]).includes(type)
    ? (type as ContentBlockType)
    : "all";
  const activityType = (ACTIVITY_TYPES as readonly string[]).includes(type)
    ? (type as ActivityType)
    : "all";

  const [cards, activities] = await Promise.all([
    view === "cards"
      ? listContentBlocksAdmin(garden.id, {
          page: pagination.page,
          pageSize: pagination.pageSize,
          search: pagination.search,
          type: cardType,
          status,
          locationId,
          sort: pagination.sort || "updated",
          direction: pagination.direction,
        })
      : Promise.resolve({ rows: [], total: 0 }),
    view === "activities"
      ? listActivitiesAdmin(garden.id, {
          page: pagination.page,
          pageSize: pagination.pageSize,
          search: pagination.search,
          type: activityType,
          status,
          locationId,
          sort: pagination.sort || "updated",
          direction: pagination.direction,
        })
      : Promise.resolve({ rows: [], total: 0 }),
  ]);

  // Plain data, not a callback: `Pagination` is a client component.
  const paginationParams: Record<string, string> = { view };
  if (pagination.search) paginationParams.search = pagination.search;
  if (status !== "all") paginationParams.status = status;
  if (type !== "all") paginationParams.type = type;
  if (locationId) paginationParams.locationId = locationId;
  if (pagination.sort) paginationParams.sort = pagination.sort;

  const viewHref = (next: "cards" | "activities") => {
    const params = new URLSearchParams();
    params.set("view", next);
    if (locationId) params.set("locationId", locationId);
    return `/admin/content?${params.toString()}`;
  };

  const rows = view === "cards" ? cards.rows : activities.rows;
  const total = view === "cards" ? cards.total : activities.total;

  return (
    <>
      <AdminPageHeader
        title="Content"
        description="Every learning card and activity in the garden, in one place. Edit any of them from the place they belong to."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Content type">
        <Button
          asChild
          variant={view === "cards" ? "default" : "outline"}
          size="sm"
          role="tab"
          aria-selected={view === "cards"}
        >
          <Link href={viewHref("cards")}>
            <FileText aria-hidden="true" />
            Learning cards
          </Link>
        </Button>
        <Button
          asChild
          variant={view === "activities" ? "default" : "outline"}
          size="sm"
          role="tab"
          aria-selected={view === "activities"}
        >
          <Link href={viewHref("activities")}>
            <ListChecks aria-hidden="true" />
            Activities
          </Link>
        </Button>
      </div>

      <AdminFilterBar
        action="/admin/content"
        searchValue={pagination.search}
        searchPlaceholder={
          view === "cards" ? "Search card titles and text…" : "Search activity prompts…"
        }
        filters={[
          {
            name: "type",
            label: "Type",
            value: type,
            options:
              view === "cards"
                ? [
                    { value: "all", label: "All card types" },
                    ...CONTENT_BLOCK_TYPES.map((value) => ({
                      value,
                      label: CONTENT_BLOCK_LABELS[value],
                    })),
                  ]
                : [
                    { value: "all", label: "All activity types" },
                    ...ACTIVITY_TYPES.map((value) => ({
                      value,
                      label: ACTIVITY_TYPE_LABELS[value],
                    })),
                  ],
          },
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              { value: "all", label: "All statuses" },
              ...PUBLISH_STATUSES.map((value) => ({
                value,
                label: PUBLISH_STATUS_LABELS[value],
              })),
            ],
          },
          {
            name: "locationId",
            label: "Place",
            value: locationId,
            options: [
              { value: "", label: "All places" },
              ...locations.map((location) => ({ value: location.id, label: location.name })),
            ],
          },
        ]}
        sortOptions={[
          { value: "updated", label: "Recently updated" },
          { value: "location", label: "Place name" },
          { value: "type", label: "Type" },
        ]}
        sortValue={pagination.sort || "updated"}
      >
        <input type="hidden" name="view" value={view} />
      </AdminFilterBar>

      {rows.length === 0 ? (
        <EmptyState
          icon={
            view === "cards" ? (
              <FileText className="size-5" aria-hidden="true" />
            ) : (
              <ListChecks className="size-5" aria-hidden="true" />
            )
          }
          title={
            pagination.search || status !== "all" || type !== "all" || locationId
              ? "Nothing matches these filters"
              : view === "cards"
                ? "No learning cards yet"
                : "No activities yet"
          }
          description={
            locations.length === 0
              ? "Create a garden place first — content always belongs to a place."
              : view === "cards"
                ? "Open a place and add its first learning card. Even one short card makes a QR scan worthwhile."
                : "Open a place and add an observation or thinking activity that sends visitors looking at the real garden."
          }
          action={
            locations.length === 0 ? (
              <Button asChild>
                <Link href="/admin/locations/new">Create a location</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/admin/locations">Browse places</Link>
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {view === "cards" ? (
                  <>
                    <TableHead>Card</TableHead>
                    <TableHead>Place</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Activity</TableHead>
                    <TableHead>Place</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead>Status</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {view === "cards"
                ? cards.rows.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/admin/locations/${block.locationId}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {block.title?.trim() || "(untitled card)"}
                          </Link>
                          <p className="line-clamp-2 max-w-prose text-xs text-muted-foreground">
                            {block.body}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {block.locationName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="soft">{CONTENT_BLOCK_LABELS[block.type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={block.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(block.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                : activities.rows.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Link
                          href={`/admin/locations/${activity.locationId}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          <span className="line-clamp-2 max-w-prose">{activity.prompt}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.locationName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="soft">{ACTIVITY_TYPE_LABELS[activity.type]}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {activity.points}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={activity.status} />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={total}
        basePath="/admin/content"
        params={paginationParams}
        className="mt-4"
      />
    </>
  );
}
