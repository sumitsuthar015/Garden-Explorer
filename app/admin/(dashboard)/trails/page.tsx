import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Route } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/stat-card";
import { AdminFilterBar, StatusBadge } from "@/components/admin/status-badge";
import { TrailRowActions } from "@/components/admin/trail-row-actions";
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
import { listTrailsAdmin } from "@/db/queries/trails";
import {
  AGE_GROUP_LABELS,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
  TRAIL_DIFFICULTY_LABELS,
  type PublishStatus,
} from "@/lib/constants";
import { paginationSchema } from "@/lib/validation/common";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trails",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminTrailsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") flat[key] = value[0];
  }

  const pagination = paginationSchema.parse(flat);
  const status = (PUBLISH_STATUSES as readonly string[]).includes(flat.status ?? "")
    ? (flat.status as PublishStatus)
    : "all";

  const garden = await ensurePrimaryGarden();
  const { rows, total } = await listTrailsAdmin(garden.id, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: pagination.search,
    status,
    sort: pagination.sort || "updated",
    direction: pagination.direction,
  });

  // Plain data, not a callback: `Pagination` is a client component.
  const paginationParams: Record<string, string> = {};
  if (pagination.search) paginationParams.search = pagination.search;
  if (status !== "all") paginationParams.status = status;
  if (pagination.sort) paginationParams.sort = pagination.sort;

  return (
    <>
      <AdminPageHeader
        title="Trails"
        description="A trail is an ordered walk through garden places. Visitors follow written directions between stops — there is no map, so the instructions matter."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/trails/new">
              <Plus aria-hidden="true" />
              New trail
            </Link>
          </Button>
        }
      />

      <AdminFilterBar
        action="/admin/trails"
        searchValue={pagination.search}
        searchPlaceholder="Search by name or slug…"
        filters={[
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
        ]}
        sortOptions={[
          { value: "updated", label: "Recently updated" },
          { value: "name", label: "Name" },
          { value: "status", label: "Status" },
        ]}
        sortValue={pagination.sort || "updated"}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Route className="size-5" aria-hidden="true" />}
          title={
            pagination.search || status !== "all"
              ? "No trails match these filters"
              : "No learning trails yet"
          }
          description={
            pagination.search || status !== "all"
              ? "Try a different search term or status."
              : "Create a trail by selecting garden places and arranging them in walking order."
          }
          action={
            <Button asChild>
              <Link href="/admin/trails/new">
                <Plus aria-hidden="true" />
                Create Trail
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trail</TableHead>
                <TableHead className="text-right">Stops</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Age group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((trail) => (
                <TableRow key={trail.id}>
                  <TableCell>
                    <div className="flex items-start gap-2.5">
                      <span aria-hidden="true" className="text-lg leading-none">
                        {trail.icon || "🥾"}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/trails/${trail.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {trail.name}
                        </Link>
                        <p className="text-xs text-muted-foreground wrap-anywhere">
                          /trails/{trail.slug} · {trail.estimatedMinutes} min
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {trail.stopCount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {TRAIL_DIFFICULTY_LABELS[trail.difficulty]}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {AGE_GROUP_LABELS[trail.ageGroup]}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={trail.status} />
                      {trail.status === "published" && trail.stopCount === 0 ? (
                        <Badge variant="warning">No stops</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(trail.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <TrailRowActions
                      id={trail.id}
                      name={trail.name}
                      slug={trail.slug}
                      status={trail.status}
                    />
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
        basePath="/admin/trails"
        params={paginationParams}
        className="mt-4"
      />
    </>
  );
}
