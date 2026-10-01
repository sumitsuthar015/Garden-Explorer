"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DISMISS_KEY = "garden-explorer:install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registers the service worker and offers a single, dismissible install prompt.
 *
 * The prompt is shown at most once: once dismissed, the visitor never sees it
 * again on this device. The service worker is only registered in production so
 * development never serves stale shells.
 */
export function PwaProvider() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  // --- Service worker registration -----------------------------------------
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* offline support is a bonus; never break the page over it */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  // --- Install prompt ------------------------------------------------------
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      // Small delay so the prompt does not compete with the page's own CTA.
      window.setTimeout(() => setVisible(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    setVisible(false);
    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      try {
        window.localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }

  if (!visible || !deferredPrompt) return null;

  return (
    <Card
      role="region"
      aria-label="Install Garden Explorer"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-start gap-3 p-4 shadow-lift animate-rise sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Download className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-semibold">Explore the garden faster</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Add Garden Explorer to your home screen for one-tap access to the scanner.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="warm" onClick={install}>
            Install
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Not Now
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </Card>
  );
}
