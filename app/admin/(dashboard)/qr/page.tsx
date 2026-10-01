import type { Metadata } from "next";
import Link from "next/link";
import { Printer, QrCode } from "lucide-react";

import { QrCreateButton } from "@/components/admin/qr-create-button";
import { QrEditButton } from "@/components/admin/qr-edit-button";
import { QrRowActions } from "@/components/admin/qr-manager";
import { QrOriginWarning } from "@/components/admin/qr-origin-warning";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { AdminFilterBar, QrStatusBadge } from "@/components/admin/status-badge";
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
import { listLocationOptions } from "@/db/queries/locations";
import { listQrCodesAdmin } from "@/db/queries/qr";
import { listTrailOptions } from "@/db/queries/trails";
import { QR_STATUSES, type QrStatus } from "@/lib/constants";
import { paginationSchema } from "@/lib/validation/common";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "QR codes",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminQrPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") flat[key] = value[0];
  }

  const pagination = paginationSchema.parse(flat);
  const status = (QR_STATUSES as readonly string[]).includes(flat.status ?? "")
    ? (flat.status as QrStatus)
    : "all";
  const locationId = flat.locationId ?? "";

  const garden = await ensurePrimaryGarden();
  const [locations, trails, origin, result] = await Promise.all([
    listLocationOptions(garden.id),
    listTrailOptions(garden.id),
    getSiteOrigin(),
    listQrCodesAdmin(garden.id, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: pagination.search,
      status,
      locationId,
      sort: pagination.sort || "created",
      direction: pagination.direction,
    }),
  ]);

  // Plain data, not a callback: `Pagination` is a client component.
  const paginationParams: Record<string, string> = {};
  if (pagination.search) paginationParams.search = pagination.search;
  if (status !== "all") paginationParams.status = status;
  if (locationId) paginationParams.locationId = locationId;

  return (
    <>
      <AdminPageHeader
        title="QR codes"
        description="Each printed sign has a stable public code. Editing location content never changes it, so signs never need reprinting."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/qr/sheet" target="_blank" rel="noopener noreferrer">
                <Printer aria-hidden="true" />
                Print all signs
              </Link>
            </Button>
            <QrCreateButton
              locations={locations.map((location) => ({
                id: location.id,
                name: location.name,
                slug: location.slug,
              }))}
              trails={trails.map((trail) => ({
                id: trail.id,
                name: trail.name,
                slug: trail.slug,
                status: trail.status,
              }))}
              defaultLocationId={locationId || undefined}
            />
          </>
        }
      />

      <QrOriginWarning origin={origin} />

      <AdminFilterBar
        action="/admin/qr"
        searchValue={pagination.search}
        searchPlaceholder="Search by code or place name…"
        filters={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "disabled", label: "Disabled" },
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
          { value: "created", label: "Newest first" },
          { value: "code", label: "Code" },
          { value: "scans", label: "Most scanned" },
          { value: "location", label: "Place name" },
        ]}
        sortValue={pagination.sort || "created"}
      />

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<QrCode className="size-5" aria-hidden="true" />}
          title={pagination.search || status !== "all" || locationId ? "No QR codes match these filters" : "No QR codes yet"}
          description={
            locations.length === 0
              ? "Create a garden place first — each QR sign belongs to one place."
              : "Create a QR code for a garden place, then print the poster and mount it on the sign."
          }
          action={
            locations.length === 0 ? (
              <Button asChild>
                <Link href="/admin/locations/new">Create a location</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Primary trail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Scans</TableHead>
                <TableHead>Last scanned</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((qr) => (
                <TableRow key={qr.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-sm font-medium wrap-anywhere">
                        {qr.publicCode}
                      </span>
                      <span className="text-[11px] text-muted-foreground wrap-anywhere">
                        {origin}/q/{qr.publicCode}
                      </span>
                      {qr.scanCount === 500 ? (
                        <Badge variant="warm">Popular sign</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {qr.locationName ? (
                      <Link
                        href={`/admin/locations/${qr.locationId}`}
                        className="text-sm hover:text-primary hover:underline"
                      >
                        {qr.locationName}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">Location missing</span>
                    )}
                    {qr.locationStatus && qr.locationStatus !== "published" ? (
                      <Badge variant="warning" className="mt-1">
                        Place is {qr.locationStatus}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {qr.primaryTrailName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <QrStatusBadge status={qr.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatNumber(qr.scanCount)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {qr.lastScannedAt ? formatDateTime(qr.lastScannedAt) : "Never"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(qr.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <QrEditButton
                        locations={locations.map((location) => ({
                          id: location.id,
                          name: location.name,
                          slug: location.slug,
                        }))}
                        trails={trails.map((trail) => ({
                          id: trail.id,
                          name: trail.name,
                          slug: trail.slug,
                          status: trail.status,
                        }))}
                        qr={{
                          id: qr.id,
                          publicCode: qr.publicCode,
                          locationId: qr.locationId,
                          primaryTrailId: qr.primaryTrailId,
                          status: qr.status,
                          label: qr.label,
                        }}
                      />
                      <QrRowActions
                        id={qr.id}
                        publicCode={qr.publicCode}
                        locationName={qr.locationName ?? "this place"}
                        status={qr.status}
                        scanCount={qr.scanCount}
                      />
                    </div>
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
        total={result.total}
        basePath="/admin/qr"
        params={paginationParams}
        className="mt-4"
      />
    </>
  );
}
