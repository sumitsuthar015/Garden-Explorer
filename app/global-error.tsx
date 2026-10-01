"use client";

import * as React from "react";

import "./globals.css";

/**
 * Last-resort boundary for failures in the root layout itself.
 * Renders its own <html>/<body> because the layout did not.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        code: "UNEXPECTED_ERROR",
        scope: "global-error-boundary",
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#F7F8F3] px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-[#DFE4D9] bg-white p-6 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-bold text-[#1F2933]">Something went wrong</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5B6A62]">
            The garden website could not start. Please reload the page. Your saved progress is stored
            in this browser and has not been affected.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="h-11 rounded-lg bg-[#2F6B4F] px-5 text-sm font-medium text-white"
            >
              Try Again
            </button>
            {/* A plain anchor on purpose: the root layout has failed, so the
                Next.js router (and therefore <Link>) cannot be trusted here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="flex h-11 items-center justify-center rounded-lg border border-[#DFE4D9] bg-white px-5 text-sm font-medium text-[#1F2933]"
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
