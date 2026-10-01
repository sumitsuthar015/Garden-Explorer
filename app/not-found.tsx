import Link from "next/link";
import { Home, QrCode } from "lucide-react";

import { Mascot } from "@/components/kids/mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
    >
      <Card className="w-full max-w-md rounded-3xl border-2 p-6 text-center sm:p-8">
        <Mascot mood="oops" className="mx-auto w-28" />
        <h1 className="mt-5 font-heading text-2xl leading-tight font-bold">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The link may have changed, or the garden is still setting this place up. Nothing is broken
          on your side.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="rounded-full">
            <Link href="/">
              <Home aria-hidden="true" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/explore">Explore the garden</Link>
          </Button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Standing in the garden?{" "}
          <Link href="/scan" className="inline-flex items-center gap-1 text-primary hover:underline">
            <QrCode className="size-3" aria-hidden="true" />
            Scan a sign
          </Link>
        </p>
      </Card>
    </main>
  );
}
