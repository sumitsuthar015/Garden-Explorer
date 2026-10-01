import { v2 as cloudinary } from "cloudinary";

import { AppError, logServerEvent } from "@/lib/errors";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";

/**
 * Cloudinary integration.
 *
 * Why signed browser uploads rather than proxying files through the server:
 * Vercel serverless functions cap request bodies and have no persistent disk,
 * so the browser uploads straight to Cloudinary using a short-lived signature
 * that only the server can mint. The API secret never leaves the server and is
 * never prefixed with NEXT_PUBLIC_.
 */

export interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
  uploadUrl: string;
  maxBytes: number;
  allowedFormats: string[];
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function configure(): void {
  const env = getServerEnv();
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError("CONFIG_MISSING", {
      logCode: "MEDIA_UPLOAD_FAILED",
      message:
        "Media uploads are not configured on this garden yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    });
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Short-lived signature so the browser can upload directly to Cloudinary. */
export function createUploadSignature(subfolder = "uploads"): CloudinarySignature {
  configure();
  const env = getServerEnv();

  const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/${subfolder}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    env.CLOUDINARY_API_SECRET as string,
  );

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME as string,
    apiKey: env.CLOUDINARY_API_KEY as string,
    folder,
    timestamp,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    maxBytes: MAX_UPLOAD_BYTES,
    allowedFormats: ALLOWED_IMAGE_MIME_TYPES.map((mime) => mime.replace("image/", "")),
  };
}

export interface UploadValidationInput {
  filename: string;
  mimeType: string;
  size: number;
}

const SAFE_FILENAME = /^[A-Za-z0-9._-]{1,120}$/;
const SAFE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "svg"]);

/**
 * Validate an upload before it is allowed to reach Cloudinary.
 * Rejects executables, unknown MIME types, oversized files and hostile
 * filenames (path traversal, null bytes, shell metacharacters).
 */
export function validateUpload(input: UploadValidationInput): void {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new AppError("UPLOAD_FAILED", { message: "That file appears to be empty." });
  }

  if (input.size > MAX_UPLOAD_BYTES) {
    throw new AppError("UPLOAD_FAILED", {
      message: `Images must be smaller than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    });
  }

  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    throw new AppError("UPLOAD_FAILED", {
      message: "Only JPG, PNG, WebP, AVIF and SVG images can be uploaded.",
    });
  }

  if (!SAFE_FILENAME.test(input.filename) || input.filename.includes("..")) {
    throw new AppError("UPLOAD_FAILED", { message: "That filename is not allowed." });
  }

  const extension = input.filename.split(".").pop()?.toLowerCase() ?? "";
  if (!SAFE_EXTENSIONS.has(extension)) {
    throw new AppError("UPLOAD_FAILED", { message: "That file extension is not allowed." });
  }
}

/** Strip any directory component and dangerous characters from a filename. */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "upload";
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned.slice(0, 100) || "upload";
}

/**
 * Build an optimised delivery URL.
 * `f_auto,q_auto` lets Cloudinary pick the best format/quality per device, and
 * a width cap keeps page weight down on mobile.
 */
export function optimizeUrl(secureUrl: string, width = 1600): string {
  if (!secureUrl.includes("/upload/")) return secureUrl;
  if (secureUrl.includes("/upload/f_auto") || secureUrl.includes("/upload/q_auto")) {
    return secureUrl;
  }
  return secureUrl.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  resourceType: string;
}

/** Persist metadata of an already-uploaded asset (server-side registration). */
export function toUploadResult(payload: {
  public_id: string;
  secure_url: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  resource_type?: string;
}): CloudinaryUploadResult {
  return {
    publicId: payload.public_id,
    secureUrl: payload.secure_url,
    format: payload.format ?? "",
    bytes: payload.bytes ?? 0,
    width: payload.width ?? null,
    height: payload.height ?? null,
    resourceType: payload.resource_type ?? "image",
  };
}

/** Best-effort asynchronous destroy — failures are logged, never surfaced. */
export async function destroyAsset(publicId: string): Promise<boolean> {
  if (!isCloudinaryConfigured()) return false;
  try {
    configure();
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return result.result === "ok" || result.result === "not found";
  } catch (error) {
    logServerEvent("error", "MEDIA_UPLOAD_FAILED", {
      operation: "destroy",
      publicId,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
