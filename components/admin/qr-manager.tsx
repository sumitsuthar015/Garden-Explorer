"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Copy,
  Download,
  Eye,
  FileImage,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import {
  createQrCodeAction,
  deleteQrCodeAction,
  regenerateQrCodeAction,
  setQrStatusAction,
  suggestPublicCodeAction,
  updateQrCodeAction,
} from "@/lib/actions/admin-qr";
import { QR_STATUSES, QR_STATUSES as QR_STATUS_VALUES, type QrStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast";

export interface LocationOption {
  id: string;
  name: string;
  slug: string;
}

export interface TrailOption {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface QrFormState {
  id?: string;
  publicCode: string;
  locationId: string;
  primaryTrailId: string;
  status: QrStatus;
  label: string;
}

/**
 * Create / edit dialog for a QR code.
 *
 * The public code is the only value printed on a sign. It is generated from the
 * location slug by default and can be regenerated later — but only explicitly,
 * because changing it invalidates an existing sticker.
 */
export function QrCodeDialog({
  mode,
  locations,
  trails,
  open,
  onOpenChange,
  initial,
  defaultLocationId,
}: {
  mode: "create" | "edit";
  locations: LocationOption[];
  trails: TrailOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: QrFormState;
  defaultLocationId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<QrFormState>({
    id: initial?.id,
    publicCode: initial?.publicCode ?? "",
    locationId: initial?.locationId ?? defaultLocationId ?? "",
    primaryTrailId: initial?.primaryTrailId ?? "",
    status: initial?.status ?? "active",
    label: initial?.label ?? "",
  });
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = React.useState(false);

  async function suggestCode(locationId: string) {
    if (!locationId) return;
    const result = await suggestPublicCodeAction(locationId);
    if (result.ok) {
      setValues((previous) => ({ ...previous, publicCode: result.data.suggestion }));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      id: values.id,
      publicCode: values.publicCode,
      locationId: values.locationId,
      primaryTrailId: values.primaryTrailId || null,
      status: values.status,
      label: values.label,
    };

    const result =
      mode === "create" ? await createQrCodeAction(payload) : await updateQrCodeAction(payload);

    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(mode === "create" ? "Could not create the QR code" : "Could not save the QR code", result.message);
      return;
    }

    toast.success(mode === "create" ? "QR code created" : "QR code updated");
    onOpenChange(false);
    setLastOpenedKey(null);
    router.refresh();
  }

  // Populate a fresh form each time the create dialog opens. This is a
  // render-phase adjustment (React's documented pattern) rather than an effect,
  // so the dialog never paints with the previous session's values.
  const resolvedDefaultLocation = defaultLocationId ?? locations[0]?.id ?? "";
  const [lastOpenedKey, setLastOpenedKey] = React.useState<string | null>(null);
  const openKey = open && mode === "create" ? `create:${resolvedDefaultLocation}` : null;

  if (openKey !== null && openKey !== lastOpenedKey) {
    setLastOpenedKey(openKey);
    setValues({
      publicCode: "",
      locationId: resolvedDefaultLocation,
      primaryTrailId: "",
      status: "active",
      label: "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create a QR code" : "Edit QR code"}</DialogTitle>
          <DialogDescription>
            The code is what gets printed under the QR square. Keeping it stable means location
            content can change as often as you like without reprinting the sign.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <FormField
            id="qr-location"
            label="Garden place"
            required
            error={errors.locationId?.[0]}
          >
            <Select
              value={values.locationId}
              onValueChange={(value) => {
                setValues((previous) => ({ ...previous, locationId: value }));
                if (mode === "create" && !values.publicCode) void suggestCode(value);
              }}
            >
              <SelectTrigger id="qr-location" aria-label="Garden place">
                <SelectValue placeholder="Choose a place" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            id="qr-code"
            label="Public code"
            required
            error={errors.publicCode?.[0]}
            description="Uppercase letters, numbers and dashes. Printed under the QR square."
          >
            {(control) => (
              <div className="flex flex-wrap gap-2">
                <Input
                  {...control}
                  value={values.publicCode}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      publicCode: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="BUTTERFLY-003"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-48 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!values.locationId}
                  onClick={() => void suggestCode(values.locationId)}
                >
                  Suggest a code
                </Button>
              </div>
            )}
          </FormField>

          <FormField
            id="qr-trail"
            label="Primary trail (optional)"
            error={errors.primaryTrailId?.[0]}
            description="When set, scanning this sign puts the visitor straight into that trail's context."
          >
            <Select
              value={values.primaryTrailId || "none"}
              onValueChange={(value) =>
                setValues((previous) => ({
                  ...previous,
                  primaryTrailId: value === "none" ? "" : value,
                }))
              }
            >
              <SelectTrigger id="qr-trail" aria-label="Primary trail">
                <SelectValue placeholder="No primary trail" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No primary trail</SelectItem>
                {trails.map((trail) => (
                  <SelectItem key={trail.id} value={trail.id}>
                    {trail.name}
                    {trail.status !== "published" ? " (not published)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField id="qr-status" label="Status" error={errors.status?.[0]}>
            <Select
              value={values.status}
              onValueChange={(value) =>
                setValues((previous) => ({ ...previous, status: value as QrStatus }))
              }
            >
              <SelectTrigger id="qr-status" aria-label="QR status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QR_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "active" ? "Active" : "Disabled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            id="qr-label"
            label="Sign label"
            error={errors.label?.[0]}
            description="Optional. Defaults to the place name. Used on the printable poster."
          >
            <Input
              value={values.label}
              maxLength={120}
              onChange={(event) => setValues((previous) => ({ ...previous, label: event.target.value }))}
              placeholder="Butterfly Watch"
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} loadingLabel="Saving…">
              {mode === "create" ? "Create QR code" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ *
 * Row actions
 * ------------------------------------------------------------------ */

type Pending =
  | { kind: "disable" }
  | { kind: "enable" }
  | { kind: "delete" }
  | { kind: "regenerate" }
  | null;

export function QrRowActions({
  id,
  publicCode,
  locationName,
  status,
  scanCount,
}: {
  id: string;
  publicCode: string;
  locationName: string;
  status: QrStatus;
  scanCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<Pending>(null);
  const [busy, setBusy] = React.useState(false);
  const [regenerated, setRegenerated] = React.useState<string | null>(null);

  async function runStatus(next: QrStatus) {
    setBusy(true);
    try {
      const result = await setQrStatusAction(id, next);
      if (!result.ok) {
        toast.error("Could not update the QR code", result.message);
        return;
      }
      toast.success(next === "disabled" ? "QR code disabled" : "QR code re-enabled");
      router.refresh();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function runDelete() {
    setBusy(true);
    try {
      const result = await deleteQrCodeAction(id);
      if (!result.ok) {
        toast.error("Could not delete the QR code", result.message);
        return;
      }
      toast.success("QR code deleted");
      router.refresh();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function runRegenerate() {
    setBusy(true);
    try {
      const result = await regenerateQrCodeAction({ id, prefix: publicCode.replace(/-[^-]*$/, "") });
      if (!result.ok) {
        toast.error("Could not regenerate the code", result.message);
        return;
      }
      toast.warning("New code generated", `Print a new sign — ${result.data.publicCode} replaces ${publicCode}.`);
      setRegenerated(result.data.publicCode);
      router.refresh();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${publicCode}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={`/q/${publicCode}`} target="_blank" rel="noopener noreferrer">
              <Eye />
              Preview visitor view
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a href={`/api/qr/${encodeURIComponent(publicCode)}/png`} download={`${publicCode}.png`}>
              <FileImage />
              Download PNG
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a href={`/api/qr/${encodeURIComponent(publicCode)}/svg`} download={`${publicCode}.svg`}>
              <Download />
              Download SVG
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/admin/qr/${id}/print`} target="_blank" rel="noopener noreferrer">
              <Printer />
              Print poster
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              void navigator.clipboard
                .writeText(`${window.location.origin}/q/${publicCode}`)
                .then(() => toast.success("Link copied"))
                .catch(() => toast.error("Could not copy the link"));
            }}
          >
            <Copy />
            Copy visitor link
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {status === "active" ? (
            <DropdownMenuItem onSelect={() => setPending({ kind: "disable" })}>
              <ToggleLeft />
              Disable QR code
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setPending({ kind: "enable" })}>
              <ToggleRight />
              Re-enable QR code
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onSelect={() => setPending({ kind: "regenerate" })}>
            <RefreshCw />
            Generate a new public code
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onSelect={() => setPending({ kind: "delete" })}>
            <Trash2 />
            Delete QR code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        pending={busy}
        destructive={pending?.kind !== "enable"}
        title={
          pending?.kind === "disable"
            ? "Disable this QR code?"
            : pending?.kind === "enable"
              ? "Re-enable this QR code?"
              : pending?.kind === "delete"
                ? `Delete ${publicCode}?`
                : "Generate a new public code?"
        }
        description={
          pending?.kind === "disable"
            ? "Visitors scanning this sign will no longer be able to access the learning point. They will see a friendly message telling them to continue to the next marked point."
            : pending?.kind === "enable"
              ? "The sign will work again immediately and the scan counter keeps its history."
              : pending?.kind === "delete"
                ? "The QR record and its scan history are removed. Delete the physical sign too, or visitors will scan a code that no longer exists."
                : `A new code replaces ${publicCode}. The sticker already on the sign will stop working, so you must print and mount a new poster. This is the only action that invalidates a printed sign, which is why location edits never trigger it.`
        }
        confirmLabel={
          pending?.kind === "disable"
            ? "Disable QR"
            : pending?.kind === "enable"
              ? "Re-enable"
              : pending?.kind === "delete"
                ? "Delete QR"
                : "Generate new code"
        }
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "disable") return runStatus("disabled");
          if (pending.kind === "enable") return runStatus("active");
          if (pending.kind === "delete") return runDelete();
          return runRegenerate();
        }}
      />

      {regenerated ? (
        <Dialog open onOpenChange={() => setRegenerated(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
                Print a new sign
              </DialogTitle>
              <DialogDescription>
                The code for {locationName} is now{" "}
                <span className="font-mono font-semibold">{regenerated}</span>. The previous sticker
                ({publicCode}) no longer resolves, and it had {scanCount} recorded scan
                {scanCount === 1 ? "" : "s"}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegenerated(null)}>
                Close
              </Button>
              <Button asChild>
                <Link href={`/admin/qr/${id}/print`} target="_blank" rel="noopener noreferrer">
                  Open printable poster
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export const QR_STATUS_OPTIONS = QR_STATUSES.map((value) => ({
  value,
  label: value === "active" ? "Active" : "Disabled",
}));
