"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import {
  createUploadSignature,
  destroyAsset,
  isCloudinaryConfigured,
  optimizeUrl,
  sanitizeFilename,
  toUploadResult,
  validateUpload,
} from "@/lib/cloudinary";
import { AppError, type ActionResult } from "@/lib/errors";
import { requireAdminPermission } from "@/lib/permissions";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security";
import { audit, runAction } from "./helpers";

/**
 * Media pipeline.
 *
 * The browser uploads the bytes straight to Cloudinary using a short-lived
 * signature minted here. The server never receives the file, which matters
 * because Vercel functions cap request bodies and have no persistent disk.
 * Afterwards the asset is registered in `media_assets` so the library and all
 * future references use a stable Cloudinary public id.
 */

const MEDIA_LOG_CODE = "MEDIA_UPLOAD_FAILED";

export async function getUploadSignatureAction(
  subfolder: string,
  file: { filename: string; mimeType: string; size: number },
): Promise<
  ActionResult<{
    cloudName: string;
    apiKey: string;
    folder: string;
    timestamp: number;
    signature: string;
    uploadUrl: string;
  }>
> {
  return runAction(MEDIA_LOG_CODE, async () => {
    await requireAdminPermission("media.upload");
    await enforceRateLimit(RATE_LIMITS.upload);

    if (!isCloudinaryConfigured()) {
      throw new AppError("CONFIG_MISSING", {
        message:
          "Media uploads are not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, then restart the server.",
      });
    }

    // Server-side validation BEFORE any bytes are allowed to move.
    validateUpload({ filename: file.filename, mimeType: file.mimeType, size: file.size });

    const safeFolder = /^[a-z0-9-]{1,40}$/.test(subfolder) ? subfolder : "uploads";
    const signature = createUploadSignature(safeFolder);

    // The API secret is never included in the payload.
    return {
      cloudName: signature.cloudName,
      apiKey: signature.apiKey,
      folder: signature.folder,
      timestamp: signature.timestamp,
      signature: signature.signature,
      uploadUrl: signature.uploadUrl,
    };
  });
}

export interface RegisterMediaInput {
  public_id: string;
  secure_url: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  resource_type?: string;
  original_filename?: string;
  alt?: string;
}

export async function registerMediaAction(
  input: RegisterMediaInput,
): Promise<ActionResult<{ id: string; secureUrl: string }>> {
  return runAction(MEDIA_LOG_CODE, async () => {
    const admin = await requireAdminPermission("media.upload");

    if (!input?.public_id || !input?.secure_url) {
      throw new AppError("UPLOAD_FAILED", {
        message: "Cloudinary did not return a usable asset.",
      });
    }

    // Only accept assets that really live in this Cloudinary account and folder.
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "garden-explorer";
    if (!input.public_id.startsWith(`${folder}/`)) {
      throw new AppError("UPLOAD_FAILED", {
        message: "That asset is outside this garden's media folder.",
      });
    }

    const result = toUploadResult(input);
    const secureUrl = optimizeUrl(result.secureUrl);

    const [created] = await db
      .insert(mediaAssets)
      .values({
        publicId: result.publicId,
        secureUrl,
        resourceType: result.resourceType,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        originalFilename: input.original_filename ? sanitizeFilename(input.original_filename) : null,
        alt: input.alt?.slice(0, 240) ?? null,
        folder,
        uploadedBy: admin.id,
      })
      .onConflictDoUpdate({
        target: mediaAssets.publicId,
        set: { secureUrl, updatedAt: new Date() },
      })
      .returning({ id: mediaAssets.id, secureUrl: mediaAssets.secureUrl });

    await audit(admin, "MEDIA_UPLOADED", "media_asset", created.id, result.publicId, {
      bytes: result.bytes,
      format: result.format,
    });
    revalidatePath("/admin/media");

    return created;
  });
}

export async function updateMediaAltAction(
  id: string,
  alt: string,
): Promise<ActionResult<{ id: string }>> {
  return runAction(MEDIA_LOG_CODE, async () => {
    const admin = await requireAdminPermission("media.update");

    await db
      .update(mediaAssets)
      .set({ alt: alt.trim().slice(0, 240) || null, updatedAt: new Date() })
      .where(eq(mediaAssets.id, id));

    await audit(admin, "MEDIA_UPLOADED", "media_asset", id, null, { action: "alt-updated" });
    revalidatePath("/admin/media");

    return { id };
  });
}

export async function deleteMediaAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(MEDIA_LOG_CODE, async () => {
    const admin = await requireAdminPermission("media.delete");

    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    if (!asset) throw new AppError("NOT_FOUND", { message: "That image no longer exists." });

    // Cloudinary is the source of truth; if the remote delete fails the row is
    // kept so the admin can retry rather than silently orphaning the asset.
    const deleted = await destroyAsset(asset.publicId);
    if (!deleted) {
      throw new AppError("UPLOAD_FAILED", {
        message: "Cloudinary could not delete that file. Please try again.",
      });
    }

    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    await audit(admin, "MEDIA_DELETED", "media_asset", id, asset.publicId);
    revalidatePath("/admin/media");

    return { id };
  });
}

/** Used by the media picker to confirm the configuration is live. */
export async function checkMediaConfigurationAction(): Promise<
  ActionResult<{ configured: boolean }>
> {
  return runAction(MEDIA_LOG_CODE, async () => {
    await requireAdminPermission("media.upload");
    return { configured: isCloudinaryConfigured() };
  });
}
