"use client";

import * as React from "react";
import { Pencil } from "lucide-react";

import {
  QrCodeDialog,
  type LocationOption,
  type TrailOption,
} from "@/components/admin/qr-manager";
import { Button } from "@/components/ui/button";
import type { QrStatus } from "@/lib/constants";

export function QrEditButton({
  locations,
  trails,
  qr,
}: {
  locations: LocationOption[];
  trails: TrailOption[];
  qr: {
    id: string;
    publicCode: string;
    locationId: string;
    primaryTrailId: string | null;
    status: QrStatus;
    label: string | null;
  };
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit QR code ${qr.publicCode}`}
        onClick={() => setOpen(true)}
      >
        <Pencil aria-hidden="true" />
      </Button>

      <QrCodeDialog
        mode="edit"
        open={open}
        onOpenChange={setOpen}
        locations={locations}
        trails={trails}
        initial={{
          id: qr.id,
          publicCode: qr.publicCode,
          locationId: qr.locationId,
          primaryTrailId: qr.primaryTrailId ?? "",
          status: qr.status,
          label: qr.label ?? "",
        }}
      />
    </>
  );
}
