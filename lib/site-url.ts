import { headers } from "next/headers";

import { isProduction, PUBLIC_APP_URL } from "@/lib/env";

/**
 * Canonical origin resolution.
 *
 * Printed QR codes must encode a STABLE url, so `NEXT_PUBLIC_APP_URL` always
 * wins when configured. The request headers are only a fallback for preview
 * deployments and local development.
 */
export async function getSiteOrigin(): Promise<string> {
  if (PUBLIC_APP_URL) return stripTrailingSlash(PUBLIC_APP_URL);

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    if (host) {
      const proto = headerList.get("x-forwarded-proto") ?? (isProduction ? "https" : "http");
      return `${proto}://${stripTrailingSlash(host)}`;
    }
  } catch {
    // `headers()` is unavailable during static generation — fall through.
  }

  return "http://localhost:3000";
}

export function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/** Absolute URL helper used by metadata, QR payloads and the sitemap. */
export async function absoluteUrl(path: string): Promise<string> {
  const origin = await getSiteOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The exact URL a printed QR code must contain for a given public code. */
export function qrTargetPath(publicCode: string): string {
  return `/q/${encodeURIComponent(publicCode.toUpperCase())}`;
}

export async function qrTargetUrl(publicCode: string): Promise<string> {
  return absoluteUrl(qrTargetPath(publicCode));
}
