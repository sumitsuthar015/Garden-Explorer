"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { createQuizAction } from "@/lib/actions/admin-quizzes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast";

interface QuizCreateButtonProps {
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
  /** Rendered inline when the page was opened for one location. */
  label?: string;
}

/**
 * Creates an empty quiz.
 *
 * New quizzes always start as drafts: a quiz with no questions must never be
 * reachable by visitors, so publishing is a deliberate second step.
 */
export function QuizCreateButton({
  locations,
  defaultLocationId,
  label = "New quiz",
}: QuizCreateButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [locationId, setLocationId] = React.useState(defaultLocationId ?? "");
  const [title, setTitle] = React.useState("Quick Quiz");
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!locationId) {
      setError("Choose the garden place this quiz belongs to.");
      return;
    }

    setBusy(true);
    try {
      const result = await createQuizAction({
        locationId,
        title,
        description: "",
        completionPoints: 25,
        displayOrder: 0,
        status: "draft",
      });

      if (!result.ok) {
        setError(result.message);
        toast.error("Could not create the quiz", result.message);
        return;
      }

      toast.success("Quiz created", "Add its first question to make it publishable.");
      setOpen(false);
      router.push(`/admin/quizzes/${result.data.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={locations.length === 0}>
          <Plus aria-hidden="true" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New quiz</DialogTitle>
          <DialogDescription>
            A quiz belongs to one garden place and appears as the last step of that place&apos;s
            learning experience.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <FormField id="quiz-location" label="Garden place" required error={error ?? undefined}>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="quiz-location" aria-label="Garden place">
                <SelectValue placeholder="Choose a place…" />
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

          <FormField id="quiz-title" label="Quiz title" required>
            <Input
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Quick Quiz"
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} loadingLabel="Creating…">
              Create quiz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
