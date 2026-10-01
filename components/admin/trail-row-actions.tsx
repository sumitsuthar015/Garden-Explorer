"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil, Send, Trash2, Undo2 } from "lucide-react";

import { deleteTrailAction, setTrailStatusAction } from "@/lib/actions/admin-trails";
import type { PublishStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";

interface TrailRowActionsProps {
  id: string;
  name: string;
  slug: string;
  status: PublishStatus;
}

/**
 * Row actions for a trail.
 *
 * Publishing goes through the server, which re-validates the stops and rejects
 * the change with a readable message when the trail is not ready to be walked.
 */
export function TrailRowActions({ id, name, slug, status }: TrailRowActionsProps) {
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
          action === "delete" ? "Could not delete this trail" : "This trail is not ready",
          result.message,
        );
        return;
      }

      toast.success(
        action === "delete"
          ? "Trail deleted"
          : unpublishing
            ? `${name} is no longer public`
            : `${name} is now live`,
      );
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
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/trails/${id}`}>
              <Pencil />
              Edit trail
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/trails/${slug}`} target="_blank" rel="noopener noreferrer">
              <Eye />
              Preview on site
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPending("status")}>
            {unpublishing ? <Undo2 /> : <Send />}
            {unpublishing ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setPending("delete")}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
            ? "This removes the trail and its stop order. The garden places themselves are untouched, so QR signs keep working. Published trails cannot be deleted — unpublish first."
            : unpublishing
              ? "The trail page will stop being reachable for visitors. QR signs for its places keep working, because each place stands on its own."
              : "Visitors will find this trail on the trails page and can walk it immediately. Publishing is checked: every stop must be a published place and every stop except the last needs written directions."
        }
        confirmLabel={
          pending === "delete" ? "Delete" : unpublishing ? "Unpublish" : "Publish"
        }
        destructive={pending === "delete" || unpublishing}
        onConfirm={() => {
          if (pending) void run(pending);
        }}
      />
    </>
  );
}
