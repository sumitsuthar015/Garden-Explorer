"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Upload } from "lucide-react";

import {
  getUploadSignatureAction,
  registerMediaAction,
} from "@/lib/actions/admin-media";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { GALLERY_PHOTOS } from "@/lib/garden-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface MediaPickerProps {
  /** Current media URL (owned by the parent form). */
  value: string | null;
  publicId: string | null;
  alt?: string | null;
  /** `alt` is a suggested description, offered when a built-in garden photo is picked. */
  onChange: (next: { url: string | null; publicId: string | null; alt?: string }) => void;
  label?: string;
  description?: string;
  id: string;
  folder?: string;
}

/**
 * Reusable Cloudinary upload field.
 *
 * Flow: ask the server for a short-lived signature → upload the bytes straight
 * from the browser to Cloudinary → register the public id and secure URL in the
 * database. The API secret never reaches the browser, and Vercel never has to
 * accept a large request body.
 */
export function MediaPicker({
  value,
  publicId,
  alt,
  onChange,
  label = "Image",
  description,
  id,
  folder = "uploads",
}: MediaPickerProps) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [manualUrl, setManualUrl] = React.useState("");

  async function handleFile(file: File) {
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Unsupported file type", "Use a JPG, PNG, WebP, AVIF or SVG image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(
        "That image is too large",
        `Images must be smaller than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }

    setUploading(true);
    setProgress("Requesting upload permission…");

    try {
      const signatureResult = await getUploadSignatureAction(folder, {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });

      if (!signatureResult.ok) {
        toast.error("Upload failed", signatureResult.message);
        return;
      }

      const signature = signatureResult.data;
      setProgress("Uploading to Cloudinary…");

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signature.apiKey);
      body.append("timestamp", String(signature.timestamp));
      body.append("signature", signature.signature);
      body.append("folder", signature.folder);

      const response = await fetch(signature.uploadUrl, { method: "POST", body });
      if (!response.ok) {
        toast.error("Upload failed", "Cloudinary rejected the file. Please try a different image.");
        return;
      }

      const payload = (await response.json()) as {
        public_id: string;
        secure_url: string;
        format?: string;
        bytes?: number;
        width?: number;
        height?: number;
        resource_type?: string;
        original_filename?: string;
      };

      setProgress("Registering image…");

      const registered = await registerMediaAction({
        ...payload,
        alt: alt ?? undefined,
      });

      if (!registered.ok) {
        toast.error("Upload failed", registered.message);
        return;
      }

      onChange({ url: registered.data.secureUrl, publicId: payload.public_id });
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed", "Check your connection and try again.");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>

      {value ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative aspect-[4/3] w-full max-w-52 overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src={value}
              alt={alt ?? "Selected image preview"}
              fill
              sizes="208px"
              className="object-cover"
              unoptimized={value.endsWith(".svg")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ url: null, publicId: null })}
            >
              <Trash2 aria-hidden="true" />
              Remove image
            </Button>
            <p className="max-w-xs text-xs break-all text-muted-foreground">{value}</p>
            {publicId ? (
              <p className="max-w-xs text-xs break-all text-muted-foreground">
                Cloudinary id: <span className="font-mono">{publicId}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-2 text-sm font-medium">No image selected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a garden photo, upload one, or paste an image URL below.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={cn(
            "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent/50",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="size-4" aria-hidden="true" />
          {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
          <input
            id={id}
            type="file"
            accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
        </label>
        {progress ? (
          <span role="status" className="text-xs text-muted-foreground">
            {progress}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Garden photos</p>
        <ul className="flex flex-wrap gap-2">
          {GALLERY_PHOTOS.map((photo) => {
            const selected = value === photo.url;
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => onChange({ url: photo.url, publicId: null, alt: photo.alt })}
                  aria-label={`Use the garden photo: ${photo.title}`}
                  aria-pressed={selected}
                  title={photo.title}
                  className={cn(
                    "relative block h-14 w-20 overflow-hidden rounded-lg ring-2 transition-[transform,box-shadow] hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selected ? "ring-primary" : "ring-transparent",
                  )}
                >
                  <Image src={photo.src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="url"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder="https://res.cloudinary.com/…/image.jpg"
          aria-label="Paste an image URL"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const trimmed = manualUrl.trim();
            if (!/^https?:\/\//.test(trimmed)) {
              toast.error("That is not a valid image URL");
              return;
            }
            onChange({ url: trimmed, publicId: null });
            setManualUrl("");
          }}
        >
          Use URL
        </Button>
      </div>
    </div>
  );
}
