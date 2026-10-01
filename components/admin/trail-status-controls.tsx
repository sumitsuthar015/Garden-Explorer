"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Undo2 } from "lucide-react";

import { deleteTrailAction, setTrailStatusAction } from "@/lib/actions/admin-trails";
import type { PublishStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/lib/toast";

interface TrailStatusControlsProps {
  id: string;
  name: string;
  status: PublishStatus;
}

/** Publish / unpublish / delete for the trail that is currently being edited. */
export function TrailStatusControls({ id, name, status }: TrailStatusControlsProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"status" | "delete" | null>(null);
  const [busy, setBusy] = React.useState(false);

  const unpublishing = status === "published";

  async function run(action: "status" | "delete") {
    setBusy(true);
    try {
      const result =
        action === "delete"
          ? await deleteTrailAction(id)
          : await setTrailStatusAction(id, unpublishing ? "draft" : "published");

      if (!result.ok) {
        toast.error(
          action === "delete" ? "Could not delete this trail" : "This trail is not ready yet",
          result.message,
        );
        return;
      }

      toast.success(
        action === "delete"
          ? "Trail deleted"
          : unpublishing
            ? "Trail unpublished"
            : "Trail published",
      );

      if (action === "delete") {
        router.push("/admin/trails");
      }
      router.refresh();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={unpublishing ? "outline" : "default"}
          size="sm"
          disabled={busy}
          onClick={() => setPending("status")}
        >
          {unpublishing ? <Undo2 aria-hidden="true" /> : <Send aria-hidden="true" />}
          {unpublishing ? "Unpublish" : "Publish trail"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={busy}
          onClick={() => setPending("delete")}
        >
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        pending={busy}
        title={
          pending === "delete"
            ? `Delete ${name}?`
            : unpublishing
              ? `Unpublish ${name}?`
              : `Publish ${name}?`
        }
        description={
          pending === "delete"
            ? "This removes the trail and its stop order. The garden places themselves are untouched, so printed QR signs keep working."
            : unpublishing
              ? "Visitors will no longer find this trail. The places on it stay reachable from their own QR signs."
              : "The trail appears on the public trails page and every stop becomes walkable. Publishing is validated on the server first."
        }
        confirmLabel={pending === "delete" ? "Delete" : unpublishing ? "Unpublish" : "Publish"}
        destructive={pending === "delete" || unpublishing}
        onConfirm={() => {
          if (pending) void run(pending);
        }}
      />
    </>
  );
}
