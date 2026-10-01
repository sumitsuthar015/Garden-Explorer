"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CameraOff,
  Image as ImageIcon,
  KeyboardIcon,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { describeScanFailure, extractQrCode, normalizeCode } from "@/lib/qr/extract";
import { toast } from "@/lib/toast";

/**
 * Mobile-first QR scanner.
 *
 * Three routes in, so a visitor is never stuck:
 *  1. Live camera (html5-qrcode, lazily imported so it never bloats the page)
 *  2. Upload / screenshot fallback
 *  3. Manual code entry printed under the sign
 *
 * Camera permission, unsupported-browser and decode failures each get their own
 * explicit, actionable state.
 */

type ScannerState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "denied" }
  | { kind: "unavailable"; reason: string }
  | { kind: "error"; message: string };

const SCANNER_ELEMENT_ID = "garden-qr-reader";

export function QrScanner() {
  const router = useRouter();
  const [state, setState] = React.useState<ScannerState>({ kind: "idle" });
  const [manualCode, setManualCode] = React.useState("");
  const [manualError, setManualError] = React.useState<string | undefined>(undefined);
  const [uploading, setUploading] = React.useState(false);

  const scannerRef = React.useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const handledRef = React.useRef(false);

  const stopCamera = React.useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      // `stop()` throws when the camera was never started; ignore that case.
      await scanner.stop();
      scanner.clear();
    } catch {
      /* already stopped */
    }
  }, []);

  React.useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const openCode = React.useCallback(
    (code: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      void stopCamera();
      router.push(`/q/${encodeURIComponent(code)}`);
    },
    [router, stopCamera],
  );

  const handleDecoded = React.useCallback(
    (decoded: string) => {
      const code = extractQrCode(decoded);
      if (!code) {
        toast.error("QR code not recognised", describeScanFailure(decoded));
        return;
      }
      openCode(code);
    },
    [openCode],
  );

  const startCamera = React.useCallback(async () => {
    setState({ kind: "starting" });
    handledRef.current = false;

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState({
        kind: "unavailable",
        reason: "This browser cannot reach the camera. Upload a QR image instead.",
      });
      return;
    }

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // A fresh instance avoids stale state after a retry.
      await stopCamera();
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          // Responsive square that stays usable from 320px up.
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
            return { width: Math.max(180, edge), height: Math.max(180, edge) };
          },
          aspectRatio: 1,
        },
        (decodedText) => handleDecoded(decodedText),
        () => {
          /* per-frame decode misses are expected and noisy — ignore */
        },
      );

      setState({ kind: "scanning" });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const message = error instanceof Error ? error.message : String(error);

      if (name === "NotAllowedError" || /permission|denied/i.test(message)) {
        setState({ kind: "denied" });
        return;
      }
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        setState({
          kind: "unavailable",
          reason: "No camera was found on this device. Upload a QR image instead.",
        });
        return;
      }
      if (name === "NotReadableError") {
        setState({
          kind: "unavailable",
          reason: "The camera is already in use by another app. Close it and try again.",
        });
        return;
      }
      setState({
        kind: "unavailable",
        reason: "Camera scanning is unavailable in this browser. Upload a QR image instead.",
      });
    }
  }, [handleDecoded, stopCamera]);

  const handleUpload = React.useCallback(
    async (file: File) => {
      setUploading(true);
      handledRef.current = false;
      try {
        if (!file.type.startsWith("image/")) {
          toast.error("That file is not an image", "Choose a photo or screenshot of the QR code.");
          return;
        }

        const { Html5Qrcode } = await import("html5-qrcode");
        // A hidden host element is required even for still-image decoding.
        let host = document.getElementById(SCANNER_ELEMENT_ID);
        if (!host) {
          host = document.createElement("div");
          host.id = SCANNER_ELEMENT_ID;
          host.style.display = "none";
          document.body.appendChild(host);
        }

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
        const decoded = await scanner.scanFile(file, false);
        scanner.clear();

        const code = extractQrCode(decoded);
        if (!code) {
          toast.error("QR code not recognised", describeScanFailure(decoded));
          return;
        }
        openCode(code);
      } catch {
        toast.error(
          "No QR code found in that image",
          "Try a sharper photo where the whole square is visible, or type the code instead.",
        );
      } finally {
        setUploading(false);
      }
    },
    [openCode],
  );

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = normalizeCode(manualCode);
    if (!code) {
      setManualError("Use the code printed under the sign, for example BUTTERFLY-003.");
      return;
    }
    setManualError(undefined);
    openCode(code);
  }

  // Only a live stream counts as "scanning"; while the camera is still starting
  // the overlay (and its loading button) stays visible so the visitor sees what
  // is happening instead of a black viewfinder.
  const scanning = state.kind === "scanning";

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden rounded-3xl border-2 border-sky-200 shadow-lift">
        {/* -------------------------------------------------- Viewfinder */}
        <div className="relative aspect-square w-full bg-[#0f1a14] sm:aspect-[4/3]">
          <div id={SCANNER_ELEMENT_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

          {!scanning ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                {state.kind === "denied" ? (
                  <ShieldAlert className="size-7" aria-hidden="true" />
                ) : state.kind === "unavailable" || state.kind === "error" ? (
                  <CameraOff className="size-7" aria-hidden="true" />
                ) : (
                  <Camera className="size-7" aria-hidden="true" />
                )}
              </span>
              <div className="max-w-xs">
                <p className="font-heading text-base font-semibold text-white">
                  {state.kind === "denied"
                    ? "Camera access is blocked"
                    : state.kind === "unavailable" || state.kind === "error"
                      ? "Camera scanning is unavailable"
                      : "Scan a learning QR"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  {state.kind === "denied"
                    ? "Please allow camera access in your browser, or upload a QR image instead."
                    : state.kind === "unavailable" || state.kind === "error"
                      ? "reason" in state
                        ? state.reason
                        : "Upload a QR image instead."
                      : "Point your camera at the Garden Explorer sign and hold steady."}
                </p>
              </div>
              <Button
                onClick={startCamera}
                variant="warm"
                size="lg"
                disabled={state.kind === "starting"}
                loading={state.kind === "starting"}
                loadingLabel="Starting camera…"
              >
                <Camera aria-hidden="true" />
                {state.kind === "denied" || state.kind === "unavailable" ? "Try camera again" : "Start Camera"}
              </Button>
            </div>
          ) : null}

          {scanning ? (
            <>
              {/* Scanning frame with an animated scan line. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="relative size-[72%] max-w-xs">
                  <span className="absolute -top-0.5 -left-0.5 size-8 rounded-tl-2xl border-t-3 border-l-3 border-white/90" />
                  <span className="absolute -top-0.5 -right-0.5 size-8 rounded-tr-2xl border-t-3 border-r-3 border-white/90" />
                  <span className="absolute -bottom-0.5 -left-0.5 size-8 rounded-bl-2xl border-b-3 border-l-3 border-white/90" />
                  <span className="absolute -right-0.5 -bottom-0.5 size-8 rounded-br-2xl border-r-3 border-b-3 border-white/90" />
                  <span className="absolute inset-x-3 h-0.5 rounded-full bg-warm shadow-[0_0_12px_2px_rgb(231_183_91/0.7)] animate-scan-line" />
                </div>
              </div>
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                Looking for a QR code…
              </p>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Point your phone camera at the QR square on the garden sign. Hold still for a moment — the
            page will open by itself.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await stopCamera();
                setState({ kind: "idle" });
              }}
              disabled={!scanning}
            >
              <CameraOff aria-hidden="true" />
              Stop camera
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await stopCamera();
                await startCamera();
              }}
              disabled={!scanning}
            >
              <RotateCcw aria-hidden="true" />
              Retry
            </Button>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------ Upload fallback */}
      <Card className="rounded-3xl border-2 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ImageIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-semibold">Upload a QR image</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Saved a photo or screenshot of the sign? Choose it here and we will read the code from
              the image.
            </p>
            <div className="mt-3">
              <label htmlFor="qr-upload" className="sr-only">
                Choose a QR code image
              </label>
              <input
                id="qr-upload"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                  event.target.value = "";
                }}
                className="block w-full cursor-pointer rounded-lg border border-input bg-card text-sm file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:text-sm file:font-medium file:text-accent-foreground"
              />
              {uploading ? (
                <p role="status" className="mt-2 text-xs text-muted-foreground">
                  Reading the QR code…
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------ Manual entry */}
      <Card className="rounded-3xl border-2 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <KeyboardIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-semibold">Type the code instead</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Every sign prints its code in small letters under the QR square.
            </p>
            <form onSubmit={handleManualSubmit} className="mt-3 flex flex-col gap-3">
              <FormField
                id="manual-code"
                label="Garden code"
                description="For example BUTTERFLY-003"
                error={manualError}
              >
                <Input
                  name="code"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                  placeholder="BUTTERFLY-003"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                />
              </FormField>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Open this place
              </Button>
            </form>
          </div>
        </div>
      </Card>

      {state.kind === "denied" ? (
        <Alert variant="warning">
          <ShieldAlert aria-hidden="true" />
          <div>
            <AlertTitle>How to allow camera access</AlertTitle>
            <AlertDescription>
              Open your browser&apos;s site settings for this page and set Camera to Allow, then choose
              &quot;Try camera again&quot;. On iPhone this is in Settings → Safari → Camera. You can
              always use the upload or manual options above instead.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
