"use client";

import * as React from "react";
import Link from "next/link";
import { Home, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Route-level error boundary.
 *
 * Visitors only ever see this generic, calm message. The technical cause is
 * reported server-side through `logServerEvent` in the code that threw, so no
 * stack trace or database detail reaches the browser.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // `digest` correlates this render with the structured server log entry.
    console.error(
      JSON.stringify({
        level: "error",
        code: "UNEXPECTED_ERROR",
        scope: "route-error-boundary",
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <main id="main" className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-6 text-center sm:p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-warm/25 text-[#7a5a10]">
          <TriangleAlert className="size-6.5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-heading text-2xl leading-tight font-bold">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We couldn&apos;t load this learning point. Your progress is safe — it lives in your own
          browser.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>
            <RefreshCw aria-hidden="true" />
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home aria-hidden="true" />
              Go Home
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
