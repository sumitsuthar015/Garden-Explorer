import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";

import { MediaLibrary } from "@/components/admin/media-library";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { AdminFilterBar } from "@/components/admin/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination } from "@/components/ui/pagination";
import { countMediaAssets, listMediaAssets } from "@/db/queries/media";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { paginationSchema } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminMediaPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") flat[key] = value[0];
  }

  const pagination = paginationSchema.parse(flat);

  const [result, total] = await Promise.all([
    listMediaAssets({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: pagination.search,
    }),
    countMediaAssets(),
  ]);

  const configured = isCloudinaryConfigured();

  // Plain data, not a callback: `Pagination` is a client component.
  const paginationParams: Record<string, string> = {};
  if (pagination.search) paginationParams.search = pagination.search;

  return (
    <>
      <AdminPageHeader
        title="Media"
        description={`${total} image${total === 1 ? "" : "s"} available to your garden content.`}
      />

      {!configured ? (
        <Alert variant="warning" className="mb-5">
          <Info aria-hidden="true" />
          <div>
            <AlertTitle>Cloudinary is not configured yet</AlertTitle>
            <AlertDescription>
              Uploads need <span className="font-mono">CLOUDINARY_CLOUD_NAME</span>,{" "}
              <span className="font-mono">CLOUDINARY_API_KEY</span> and{" "}
              <span className="font-mono">CLOUDINARY_API_SECRET</span>. Until then you can still paste
              an image URL into any image field. See the README for the setup steps.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <AdminFilterBar
        action="/admin/media"
        searchValue={pagination.search}
        searchPlaceholder="Search by file name, cloud id or alt text…"
      />

      <MediaLibrary
        assets={result.rows.map((asset) => ({
          id: asset.id,
          publicId: asset.publicId,
          secureUrl: asset.secureUrl,
          format: asset.format ?? "",
          bytes: asset.bytes,
          width: asset.width,
          height: asset.height,
          alt: asset.alt ?? "",
          originalFilename: asset.originalFilename ?? "",
          folder: asset.folder ?? "",
          createdAt: asset.createdAt.toISOString(),
        }))}
      />

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={result.total}
        basePath="/admin/media"
        params={paginationParams}
        className="mt-4"
      />

      <p className="mt-4 text-xs text-muted-foreground">
        Looking for where an image is used?{" "}
        <Link href="/admin/locations" className="underline hover:text-foreground">
          Open a place
        </Link>{" "}
        and check its hero image and learning cards.
      </p>
    </>
  );
}
