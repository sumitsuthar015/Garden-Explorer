"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import {
  QrCodeDialog,
  type LocationOption,
  type TrailOption,
} from "@/components/admin/qr-manager";
import { Button } from "@/components/ui/button";

/** Client wrapper so the server page can stay a Server Component. */
export function QrCreateButton({
  locations,
  trails,
  defaultLocationId,
}: {
  locations: LocationOption[];
  trails: TrailOption[];
  defaultLocationId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const disabled = locations.length === 0;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <Plus aria-hidden="true" />
        New QR code
      </Button>

      {disabled ? (
        <span className="sr-only">Create a garden place before adding a QR code.</span>
      ) : (
        <QrCodeDialog
          mode="create"
          open={open}
          onOpenChange={setOpen}
          locations={locations}
          trails={trails}
          defaultLocationId={defaultLocationId}
        />
      )}
    </>
  );
}
