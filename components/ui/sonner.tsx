"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Global toast surface. Types used across the app: success, error, warning, info.
 * Positioned bottom-center on mobile so it never covers header actions.
 */
function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-card !text-card-foreground !shadow-lift !font-sans",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-muted !text-muted-foreground",
        },
      }}
    />
  );
}

export { Toaster };
