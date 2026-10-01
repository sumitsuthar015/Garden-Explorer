"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, ImageOff, Images, Pencil, Trash2, Upload } from "lucide-react";

import { deleteMediaAction, updateMediaAltAction } from "@/lib/actions/admin-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { MediaPicker } from "@/components/admin/media-picker";
import { formatDate, formatFileSize } from "@/lib/utils";
import { toast } from "@/lib/toast";

export interface LibraryAsset {
  id: string;
  publicId: string;
  secureUrl: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  originalFilename: string;
  folder: string;
  createdAt: string;
}

interface MediaLibraryProps {
  assets: LibraryAsset[];
}

/**
 * Cloudinary media library.
 *
 * Uploads go straight from the browser to Cloudinary with a server-minted
 * signature; the server only ever stores the public id and secure URL. Deleting
 * removes the remote asset first, so a failed remote delete leaves the record in
 * place rather than orphaning a file.
 */
export function MediaLibrary({ assets }: MediaLibraryProps) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploaded, setUploaded] = React.useState<{ url: string | null; publicId: string | null }>({
    url: null,
    publicId: null,
  });
  const [editing, setEditing] = React.useState<LibraryAsset | null>(null);
  const [altDraft, setAltDraft] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<LibraryAsset | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function copyUrl(asset: LibraryAsset) {
    try {
      await navigator.clipboard.writeText(asset.secureUrl);
      toast.success("Image URL copied");
    } catch {
      toast.error("Could not copy", "Select the URL text and copy it manually.");
    }
  }

  async function saveAlt() {
    if (!editing) return;
    setBusy(true);
    try {
      const result = await updateMediaAltAction(editing.id, altDraft);
      if (!result.ok) {
        toast.error("Could not save the description", result.message);
        return;
      }
      toast.success("Image description saved");
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await deleteMediaAction(deleteTarget.id);
      if (!result.ok) {
        toast.error("Could not delete this image", result.message);
        return;
      }
      toast.success("Image deleted");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">Media library</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Images live in Cloudinary, never on the server — Vercel has no persistent disk. Deleting
            here removes the file from Cloudinary too.
          </p>
        </div>

        <Dialog
          open={uploadOpen}
          onOpenChange={(open) => {
            setUploadOpen(open);
            if (!open) {
              const changed = uploaded.url !== null;
              setUploaded({ url: null, publicId: null });
              if (changed) router.refresh();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload aria-hidden="true" />
              Upload image
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload an image</DialogTitle>
              <DialogDescription>
                JPG, PNG, WebP, AVIF or SVG up to 8 MB. The file goes straight to Cloudinary with a
                short-lived signature — it never passes through this server.
              </DialogDescription>
            </DialogHeader>

            <MediaPicker
              id="library-upload"
              label="Image file"
              folder="library"
              value={uploaded.url}
              publicId={uploaded.publicId}
              onChange={(next) => setUploaded(next)}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4">
        {assets.length === 0 ? (
          <EmptyState
            icon={<Images className="size-5" aria-hidden="true" />}
            title="No media yet"
            description="Upload garden photos here, then pick them when building a location or a learning card. You can also paste an image URL directly in any image field."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <li
                key={asset.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {asset.secureUrl ? (
                    <Image
                      src={asset.secureUrl}
                      alt={asset.alt || asset.originalFilename || "Garden media"}
                      fill
                      sizes="(max-width: 640px) 100vw, 320px"
                      className="object-cover"
                      unoptimized={asset.format === "svg"}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageOff className="size-6" aria-hidden="true" />
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="truncate text-sm font-medium" title={asset.originalFilename}>
                    {asset.originalFilename || asset.publicId.split("/").pop()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset.format.toUpperCase()} · {formatFileSize(asset.bytes)}
                    {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(asset.createdAt)}</p>

                  {asset.alt ? (
                    <Badge variant="muted" className="w-fit">
                      Alt text set
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="w-fit">
                      Needs alt text
                    </Badge>
                  )}

                  <div className="mt-auto flex gap-1 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copy image URL"
                      onClick={() => void copyUrl(asset)}
                    >
                      <Copy aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit image description"
                      onClick={() => {
                        setEditing(asset);
                        setAltDraft(asset.alt);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      aria-label="Delete image"
                      onClick={() => setDeleteTarget(asset)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => (!open ? setEditing(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image description</DialogTitle>
            <DialogDescription>
              Alt text is what a screen reader reads aloud. Describe what is in the picture, not the
              file name.
            </DialogDescription>
          </DialogHeader>

          <FormField
            id="media-alt"
            label="Alt text"
            description="For example: “Red admiral butterfly resting on a purple buddleia flower.”"
          >
            <Input
              id="media-alt"
              value={altDraft}
              maxLength={240}
              onChange={(event) => setAltDraft(event.target.value)}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" loading={busy} loadingLabel="Saving…" onClick={() => void saveAlt()}>
              Save description
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        pending={busy}
        title="Delete this image?"
        description="The file is deleted from Cloudinary and removed from this library. Any page still showing it will fall back to its placeholder."
        confirmLabel="Delete image"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
