import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "You're offline",
  description: "Garden Explorer needs a connection to load new garden content.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-14">
      <Card className="max-w-md p-7 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CloudOff className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold">You&apos;re Offline</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Some previously visited garden content may still be available. Reconnect to continue
          exploring — scanning a new QR code needs a live connection so we can check the latest
          learning point.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/progress">My Progress</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
