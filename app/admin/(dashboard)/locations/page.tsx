import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/stat-card";
import { AdminFilterBar, StatusBadge } from "@/components/admin/status-badge";
import { LocationRowActions } from "@/components/admin/location-row-actions";
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
import { listLocationsAdmin } from "@/db/queries/locations";
import {
  LOCATION_CATEGORIES,
  LOCATION_CATEGORY_ICONS,
  LOCATION_CATEGORY_LABELS,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
  type LocationCategory,
  type PublishStatus,
} from "@/lib/constants";
import { paginationSchema } from "@/lib/validation/common";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Locations",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminLocationsPage({ searchParams }: PageProps) {
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
  const category = (LOCATION_CATEGORIES as readonly string[]).includes(flat.category ?? "")
    ? (flat.category as LocationCategory)
    : "all";

  const garden = await ensurePrimaryGarden();
  const { rows, total } = await listLocationsAdmin(garden.id, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: pagination.search,
    status,
    category,
    sort: pagination.sort || "updated",
    direction: pagination.direction,
  });

  // Plain data, not a callback: `Pagination` is a client component.
  const paginationParams: Record<string, string> = {};
  if (pagination.search) paginationParams.search = pagination.search;
  if (status !== "all") paginationParams.status = status;
  if (category !== "all") paginationParams.category = category;
  if (pagination.sort) paginationParams.sort = pagination.sort;

  return (
    <>
      <AdminPageHeader
        title="Locations"
        description="The physical places in the garden. Each place can carry learning cards, observation activities, a quiz and one or more QR signs."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/locations/new">
              <Plus aria-hidden="true" />
              New location
            </Link>
          </Button>
        }
      />

      <AdminFilterBar
        action="/admin/locations"
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
          {
            name: "category",
            label: "Category",
            value: category,
            options: [
              { value: "all", label: "All categories" },
              ...LOCATION_CATEGORIES.map((value) => ({
                value,
                label: LOCATION_CATEGORY_LABELS[value],
              })),
            ],
          },
        ]}
        sortOptions={[
          { value: "updated", label: "Recently updated" },
          { value: "name", label: "Name" },
          { value: "status", label: "Status" },
          { value: "category", label: "Category" },
        ]}
        sortValue={pagination.sort || "updated"}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-5" aria-hidden="true" />}
          title={
            pagination.search || status !== "all" || category !== "all"
              ? "No locations match these filters"
              : "No garden locations yet"
          }
          description={
            pagination.search || status !== "all" || category !== "all"
              ? "Try clearing the search or choosing a different status."
              : "Create your first location to begin building the learning experience."
          }
          action={
            <Button asChild>
              <Link href="/admin/locations/new">
                <Plus aria-hidden="true" />
                Create Location
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Place</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Content</TableHead>
                <TableHead className="text-right">QR signs</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <div className="flex items-start gap-2.5">
                      <span aria-hidden="true" className="text-lg leading-none">
                        {location.icon || LOCATION_CATEGORY_ICONS[location.category]}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/locations/${location.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {location.name}
                        </Link>
                        <p className="text-xs text-muted-foreground wrap-anywhere">
                          /locations/{location.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">{LOCATION_CATEGORY_LABELS[location.category]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={location.status} />
                      {location.featured ? <Badge variant="warm">Featured</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {location.contentBlockCount}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {location.qrCount}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(location.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <LocationRowActions
                      id={location.id}
                      name={location.name}
                      slug={location.slug}
                      status={location.status}
                      canPreview
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
        basePath="/admin/locations"
        params={paginationParams}
        className="mt-4"
      />
    </>
  );
}
