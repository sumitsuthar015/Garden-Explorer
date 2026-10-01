"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil, Send, Archive, Trash2, Undo2 } from "lucide-react";

import {
  deleteLocationAction,
  setLocationStatusAction,
} from "@/lib/actions/admin-locations";
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

interface LocationRowActionsProps {
  id: string;
  name: string;
  slug: string;
  status: PublishStatus;
  /** An unpublished place can be previewed by an admin on the public route. */
  canPreview: boolean;
}

type PendingAction =
  | { kind: "status"; status: PublishStatus }
  | { kind: "delete" }
  | null;

export function LocationRowActions({
  id,
  name,
  slug,
  status,
  canPreview,
}: LocationRowActionsProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<PendingAction>(null);
  const [busy, setBusy] = React.useState(false);

  async function runStatus(next: PublishStatus) {
    setBusy(true);
    try {
      const result = await setLocationStatusAction(id, next);
      if (!result.ok) {
        toast.error("Could not change the status", result.message);
        return;
      }
      toast.success(
        next === "published"
          ? `${name} is now live`
          : next === "draft"
            ? `${name} is unpublished`
            : `${name} was archived`,
      );
      router.refresh();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function runDelete() {
    setBusy(true);
    try {
      const result = await deleteLocationAction(id);
      if (!result.ok) {
        toast.error("Could not delete this place", result.message);
        return;
      }
      toast.success("Location deleted");
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
            <Link href={`/admin/locations/${id}`}>
              <Pencil />
              Edit place
            </Link>
          </DropdownMenuItem>

          {/* Drafts can be previewed by an admin, which is how content is checked
              before it becomes visible to visitors. */}
          {canPreview ? (
            <DropdownMenuItem asChild>
              <Link href={`/locations/${slug}`} target="_blank" rel="noopener noreferrer">
                <Eye />
                Preview
              </Link>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          {status !== "published" ? (
            <DropdownMenuItem onSelect={() => setPending({ kind: "status", status: "published" })}>
              <Send />
              Publish
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setPending({ kind: "status", status: "draft" })}>
              <Undo2 />
              Unpublish
            </DropdownMenuItem>
          )}

          {status !== "archived" ? (
            <DropdownMenuItem onSelect={() => setPending({ kind: "status", status: "archived" })}>
              <Archive />
              Archive
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onSelect={() => setPending({ kind: "delete" })}>
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
          pending?.kind === "delete"
            ? `Delete ${name}?`
            : pending?.status === "published"
              ? `Publish ${name}?`
              : pending?.status === "draft"
                ? `Unpublish ${name}?`
                : `Archive ${name}?`
        }
        description={
          pending?.kind === "delete"
            ? "This permanently removes the place, its content blocks and its activities. Places that are published, have scan history or belong to a trail cannot be deleted — archive those instead."
            : pending?.status === "published"
              ? "Visitors will be able to open this learning point from its QR sign and from the explore page immediately."
              : pending?.status === "draft"
                ? "Visitors will no longer see this place. Its QR code will show the friendly 'learning point unavailable' screen instead of an error."
                : "Archiving keeps the record and its history but hides it from every public page. You can restore it later."
        }
        confirmLabel={
          pending?.kind === "delete"
            ? "Delete"
            : pending?.status === "published"
              ? "Publish"
              : pending?.status === "draft"
                ? "Unpublish"
                : "Archive"
        }
        destructive={pending?.kind === "delete" || pending?.status !== "published"}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "delete") return runDelete();
          return runStatus(pending.status);
        }}
      />
    </>
  );
}
