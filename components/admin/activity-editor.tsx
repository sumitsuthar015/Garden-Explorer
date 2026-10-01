"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";

import type { Activity } from "@/db/schema";
import { deleteActivityAction, saveActivityAction } from "@/lib/actions/admin-locations";
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
  type ActivityType,
  type PublishStatus,
} from "@/lib/constants";
import { activitySchema, type ActivityInput } from "@/lib/validation/activity";
import { formResolver } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

interface ActivityEditorProps {
  locationId: string;
  activities: Activity[];
}

type FormValues = ActivityInput;

const MAX_OPTIONS = 6;

/**
 * Activity editor.
 *
 * The form shows only the fields the selected activity type actually uses, and
 * the same Zod refinement the server runs is applied on the client, so an
 * unsolvable activity cannot be saved in the first place.
 */
export function ActivityEditor({ locationId, activities }: ActivityEditorProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Activity | null>(null);
  const [busy, setBusy] = React.useState(false);

  const ordered = React.useMemo(
    () => [...activities].sort((a, b) => a.displayOrder - b.displayOrder),
    [activities],
  );

  const form = useForm<FormValues>({
    resolver: formResolver<FormValues>(activitySchema),
    defaultValues: emptyValues(ordered.length),
  });

  const type = useWatch({ control: form.control, name: "type" });
  const status = useWatch({ control: form.control, name: "status" });
  const options = useWatch({ control: form.control, name: "config.options" }) ?? [];
  const optionCount = options.length;
  const correctIndex = useWatch({ control: form.control, name: "config.correctIndex" }) ?? 0;
  const correctIndexes = useWatch({ control: form.control, name: "config.correctIndexes" }) ?? [];
  const expectedAnswer = useWatch({ control: form.control, name: "config.answer" });

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues(ordered.length));
    setOpen(true);
  }

  function openEdit(activity: Activity) {
    setEditing(activity);
    const config = activity.config ?? {};
    const options = config.options?.length ? config.options : ["", ""];
    form.reset({
      id: activity.id,
      type: activity.type,
      prompt: activity.prompt,
      hint: activity.hint ?? "",
      successMessage: activity.successMessage,
      config: {
        confirmLabel: config.confirmLabel ?? "I found one",
        answer: config.answer ?? false,
        options,
        correctIndex: config.correctIndex ?? 0,
        correctIndexes: config.correctIndexes ?? [],
        sampleAnswer: config.sampleAnswer ?? "",
        minLength: config.minLength ?? 0,
      },
      points: activity.points,
      displayOrder: activity.displayOrder,
      status: activity.status,
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const result = await saveActivityAction({
      ...values,
      locationId,
      hint: values.hint || "",
      config: {
        ...values.config,
        options: (values.config?.options ?? []).map((option) => option.trim()).filter(Boolean),
      },
    });

    if (!result.ok) {
      toast.error("Could not save this activity", result.message);
      return;
    }

    toast.success(editing ? "Activity updated" : "Activity added");
    setOpen(false);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await deleteActivityAction(deleteTarget.id);
      if (!result.ok) {
        toast.error("Could not delete", result.message);
        return;
      }
      toast.success("Activity deleted");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">Observation and science activities</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            These are what connect the phone to the real garden. Observation and thinking activities
            are never graded — only yes/no and choice activities are checked.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden="true" />
          Add activity
        </Button>
      </div>

      <div className="mt-4">
        {ordered.length === 0 ? (
          <EmptyState
            icon={<Eye className="size-5" aria-hidden="true" />}
            title="No activities yet"
            description="Add an observation activity to get visitors looking at the real plants and animals around them."
            action={
              <Button onClick={openCreate}>
                <Plus aria-hidden="true" />
                Add the first activity
              </Button>
            }
          />
        ) : (
          <ol className="flex flex-col gap-3">
            {ordered.map((activity, index) => (
              <li
                key={activity.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="soft">{ACTIVITY_TYPE_LABELS[activity.type]}</Badge>
                    <Badge variant="muted">{activity.points} XP</Badge>
                    {activity.status === "draft" ? <Badge variant="warning">Draft</Badge> : null}
                  </div>
                  <p className="mt-2 font-medium">{activity.prompt}</p>
                  {activity.hint ? (
                    <p className="mt-1 text-xs text-muted-foreground">Hint: {activity.hint}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit activity"
                    onClick={() => openEdit(activity)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label="Delete activity"
                    onClick={() => setDeleteTarget(activity)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit activity" : "Add activity"}</DialogTitle>
            <DialogDescription>
              Write the prompt as an instruction a visitor can act on where they are standing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="activity-type" label="Activity type" required error={form.formState.errors.type?.message}>
                <Select
                  value={type}
                  onValueChange={(value) =>
                    form.setValue("type", value as ActivityType, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="activity-type" aria-label="Activity type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ACTIVITY_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField id="activity-status" label="Status" error={form.formState.errors.status?.message}>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    form.setValue("status", value as PublishStatus, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="activity-status" aria-label="Activity status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLISH_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PUBLISH_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField
              id="activity-prompt"
              label="Prompt"
              required
              error={form.formState.errors.prompt?.message}
              description={
                type === "thinking"
                  ? "A question to think about, for example: Why do you think leaves have different shapes?"
                  : "An instruction, for example: Look around the plants near the walkway. Can you spot a butterfly visiting a flower?"
              }
            >
              <Textarea rows={3} maxLength={600} {...form.register("prompt")} />
            </FormField>

            {/* ---- Type-specific configuration ---- */}
            {(type === "multiple_choice" || type === "selection") ? (
              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium">Answer options</legend>
                {Array.from({ length: Math.max(optionCount, 2) }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold"
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <Input
                      aria-label={`Option ${String.fromCharCode(65 + index)}`}
                      defaultValue={options[index] ?? ""}
                      maxLength={120}
                      onChange={(event) => {
                        const next = [...(form.getValues("config.options") ?? [])];
                        next[index] = event.target.value;
                        form.setValue("config.options", next, { shouldValidate: true });
                      }}
                    />

                    {type === "multiple_choice" ? (
                      <label className="flex shrink-0 items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="correct-option"
                          checked={correctIndex === index}
                          onChange={() =>
                            form.setValue("config.correctIndex", index, { shouldValidate: true })
                          }
                          className="size-4 accent-[#2F6B4F]"
                        />
                        Correct
                      </label>
                    ) : (
                      <label className="flex shrink-0 items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={correctIndexes.includes(index)}
                          onChange={(event) => {
                            const current = form.getValues("config.correctIndexes") ?? [];
                            form.setValue(
                              "config.correctIndexes",
                              event.target.checked
                                ? [...current, index]
                                : current.filter((value) => value !== index),
                              { shouldValidate: true },
                            );
                          }}
                          className="size-4 accent-[#2F6B4F]"
                        />
                        Correct
                      </label>
                    )}
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={optionCount >= MAX_OPTIONS}
                    onClick={() => {
                      const next = [...(form.getValues("config.options") ?? []), ""];
                      form.setValue("config.options", next, { shouldValidate: true });
                    }}
                  >
                    Add option
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={optionCount <= 2}
                    onClick={() => {
                      const next = (form.getValues("config.options") ?? []).slice(0, -1);
                      form.setValue("config.options", next, { shouldValidate: true });
                    }}
                  >
                    Remove last
                  </Button>
                </div>

                {form.formState.errors.config?.options ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {String(form.formState.errors.config.options.message ?? "Check the options")}
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {type === "yes_no" ? (
              <FormField
                id="activity-answer"
                label="Expected answer"
                required
                error={form.formState.errors.config?.answer?.message}
              >
                <Select
                  value={expectedAnswer ? "yes" : "no"}
                  onValueChange={(value) =>
                    form.setValue("config.answer", value === "yes", { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="activity-answer" aria-label="Expected answer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}

            {type === "observation" ? (
              <FormField
                id="activity-confirm"
                label="Confirmation button label"
                error={form.formState.errors.config?.confirmLabel?.message}
              >
                <Input placeholder="I found one" maxLength={60} {...form.register("config.confirmLabel")} />
              </FormField>
            ) : null}

            {type === "thinking" ? (
              <FormField
                id="activity-sample"
                label="Example answer shown after saving"
                error={form.formState.errors.config?.sampleAnswer?.message}
                description="A gardener's example, revealed once the visitor has written their own thought."
              >
                <Textarea rows={3} maxLength={400} {...form.register("config.sampleAnswer")} />
              </FormField>
            ) : null}

            <FormField
              id="activity-hint"
              label="Hint"
              error={form.formState.errors.hint?.message}
              description="Shown after an incorrect answer. Never make it a dead end — hints should guide, not block."
            >
              <Textarea rows={2} maxLength={400} {...form.register("hint")} />
            </FormField>

            <FormField
              id="activity-success"
              label="Success message"
              required
              error={form.formState.errors.successMessage?.message}
            >
              <Input placeholder="Great noticing!" maxLength={240} {...form.register("successMessage")} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="activity-points"
                label="Points"
                required
                error={form.formState.errors.points?.message}
                description="Awarded once when the activity is completed."
              >
                <Input type="number" min={0} max={1000} {...form.register("points")} />
              </FormField>

              <FormField
                id="activity-order"
                label="Display order"
                error={form.formState.errors.displayOrder?.message}
              >
                <Input type="number" min={0} max={9999} {...form.register("displayOrder")} />
              </FormField>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
                {editing ? "Save activity" : "Add activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        pending={busy}
        title="Delete this activity?"
        description="Visitors will no longer see this activity at this stop. Existing anonymous completion records are kept for analytics."
        confirmLabel="Delete activity"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}

function emptyValues(displayOrder: number): FormValues {
  return {
    type: "observation",
    locationId: "",
    prompt: "",
    hint: "",
    successMessage: "Nice work!",
    config: {
      confirmLabel: "I found one",
      answer: false,
      options: ["", ""],
      correctIndex: 0,
      correctIndexes: [],
      sampleAnswer: "",
      minLength: 0,
    },
    points: 10,
    displayOrder,
    status: "published",
  };
}
