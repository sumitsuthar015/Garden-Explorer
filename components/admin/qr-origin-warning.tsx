import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Warns before printing when QR codes would encode a local-only address.
 * A sign that points at localhost opens nothing on a visitor's phone.
 */
export function QrOriginWarning({ origin }: { origin: string }) {
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return null;
  }
  if (!LOCAL_HOSTS.has(hostname)) return null;

  return (
    <Alert variant="warning" className="print-hidden mb-5">
      <TriangleAlert aria-hidden="true" />
      <div>
        <AlertTitle>These QR codes only work on this computer</AlertTitle>
        <AlertDescription>
          <p>
            They point to <code className="font-mono font-semibold">{origin}</code>, which a
            visitor&apos;s phone cannot open. Before printing signs for the garden, put the site
            online (for example on Vercel) and print from the live site&apos;s admin, so every QR
            carries the public address. Off Vercel, also set{" "}
            <code className="font-mono">NEXT_PUBLIC_APP_URL</code> to that address.
          </p>
          <p className="mt-1.5">
            The short code printed under each QR never changes, so visitors can always type it on
            the Scan page.
          </p>
        </AlertDescription>
      </div>
    </Alert>
  );
}
