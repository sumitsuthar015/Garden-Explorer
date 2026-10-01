"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Undo2 } from "lucide-react";

import { deleteQuizAction, setQuizStatusAction } from "@/lib/actions/admin-quizzes";
import type { PublishStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/lib/toast";

interface QuizStatusControlsProps {
  id: string;
  title: string;
  status: PublishStatus;
}

/** Publish, unpublish or delete the quiz being edited. */
export function QuizStatusControls({ id, title, status }: QuizStatusControlsProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"status" | "delete" | null>(null);
  const [busy, setBusy] = React.useState(false);

  const unpublishing = status === "published";

  async function run(action: "status" | "delete") {
    setBusy(true);
    try {
      const result =
        action === "delete"
          ? await deleteQuizAction(id)
          : await setQuizStatusAction(id, unpublishing ? "draft" : "published");

      if (!result.ok) {
        toast.error(
          action === "delete" ? "Could not delete this quiz" : "This quiz is not ready yet",
          result.message,
        );
        return;
      }

      toast.success(
        action === "delete"
          ? "Quiz deleted"
          : unpublishing
            ? "Quiz unpublished"
            : "Quiz published",
      );

      if (action === "delete") {
        router.push("/admin/quizzes");
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
          {unpublishing ? "Unpublish" : "Publish quiz"}
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
            ? `Delete “${title}”?`
            : unpublishing
              ? `Unpublish “${title}”?`
              : `Publish “${title}”?`
        }
        description={
          pending === "delete"
            ? "The quiz and its questions are removed permanently. Unpublish it first — a published quiz cannot be deleted."
            : unpublishing
              ? "Visitors will no longer be asked these questions at this place. The learning cards and activities stay as they are."
              : "Every visitor who finishes this place will see the quiz. It is checked on the server first: at least one question, two or more distinct options each, and exactly one correct answer."
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
