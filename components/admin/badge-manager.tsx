"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteBadgeAction, saveBadgeAction } from "@/lib/actions/admin-badges";
import { badgeSchema, badgeCriteriaTypes, type BadgeInput } from "@/lib/validation/badge";
import {
  LOCATION_CATEGORIES,
  LOCATION_CATEGORY_LABELS,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
  type LocationCategory,
  type PublishStatus,
} from "@/lib/constants";
import { formResolver } from "@/lib/forms";
import { useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge as BadgeChip } from "@/components/ui/badge";
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

export interface AdminBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteriaType: BadgeInput["criteriaType"];
  config: BadgeInput["config"];
  displayOrder: number;
  status: PublishStatus;
}

interface BadgeManagerProps {
  badges: AdminBadge[];
  locations: { id: string; name: string; slug: string }[];
  trails: { id: string; name: string; slug: string }[];
}

const CRITERIA_LABELS: Record<BadgeInput["criteriaType"], string> = {
  locations_completed: "A number of garden places completed",
  trail_completed: "One specific trail completed",
  trails_completed: "A number of trails completed",
  quiz_first_try: "A number of questions answered correctly first try",
  activities_completed: "A number of activities completed",
  xp_earned: "A total number of XP earned",
  category_completed: "A number of places in one category",
  location_completed: "One specific garden place completed",
  quiz_accuracy: "A quiz accuracy target",
};

const CRITERIA_HINTS: Record<BadgeInput["criteriaType"], string> = {
  locations_completed: "Counted from the visitor's local progress.",
  trail_completed: "Awarded the moment the chosen trail is finished.",
  trails_completed: "Rewards repeat explorers.",
  quiz_first_try: "Encourages careful reading before answering.",
  activities_completed: "Observation and thinking activities.",
  xp_earned: "An overall effort badge.",
  category_completed: "Great for themed badges like “Plant Detective”.",
  location_completed: "A single-stop badge.",
  quiz_accuracy: "Needs the minimum number of answered questions before it counts.",
};

const COUNT_CRITERIA: BadgeInput["criteriaType"][] = [
  "locations_completed",
  "trails_completed",
  "quiz_first_try",
  "activities_completed",
  "xp_earned",
  "category_completed",
];

/**
 * Badge manager.
 *
 * Badge rules are data. The form only ever writes a criteria type plus a small
 * config object, and `lib/badges.ts` evaluates them — so a new badge needs no
 * code change and the public progress page can evaluate the same rules locally.
 */
export function BadgeManager({ badges, locations, trails }: BadgeManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<AdminBadge | null>(null);
  const [open, setOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminBadge | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<BadgeInput>({
    resolver: formResolver<BadgeInput>(badgeSchema),
    defaultValues: emptyBadge(badges.length),
  });

  const criteriaType = useWatch({ control: form.control, name: "criteriaType" });
  const status = useWatch({ control: form.control, name: "status" });
  const config = useWatch({ control: form.control, name: "config" }) ?? {};

  function openCreate() {
    setEditing(null);
    setServerError(null);
    form.reset(emptyBadge(badges.length));
    setOpen(true);
  }

  function openEdit(badge: AdminBadge) {
    setEditing(badge);
    setServerError(null);
    form.reset({
      id: badge.id,
      code: badge.code,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      criteriaType: badge.criteriaType,
      config: badge.config ?? {},
      displayOrder: badge.displayOrder,
      status: badge.status,
    });
    setOpen(true);
  }

  function setConfig(patch: Record<string, unknown>) {
    form.setValue("config", { ...(config ?? {}), ...patch }, { shouldValidate: true });
  }

  async function onSubmit(values: BadgeInput) {
    setServerError(null);

    const result = await saveBadgeAction({
      ...values,
      description: values.description,
      config: values.config ?? {},
    });

    if (!result.ok) {
      setServerError(result.message);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof BadgeInput, { message: messages[0] });
        }
      }
      toast.error("Could not save this badge", result.message);
      return;
    }

    toast.success(editing ? "Badge updated" : "Badge created");
    setOpen(false);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await deleteBadgeAction(deleteTarget.id);
      if (!result.ok) {
        toast.error("Could not delete this badge", result.message);
        return;
      }
      toast.success("Badge deleted");
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
          <h2 className="font-heading text-base font-semibold">Badges</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Badges are awarded from the visitor&apos;s own progress in their browser. No account is
            created and nothing personal is stored.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New badge
        </Button>
      </div>

      <div className="mt-4">
        {badges.length === 0 ? (
          <EmptyState
            icon={<Award className="size-5" aria-hidden="true" />}
            title="No badges yet"
            description="Create a badge to give visitors something to aim for, like finishing a trail or spotting pollinators."
            action={
              <Button onClick={openCreate}>
                <Plus aria-hidden="true" />
                Create a badge
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {badges.map((badge) => (
              <li
                key={badge.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  {badge.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{badge.name}</span>
                    <BadgeChip
                      variant={badge.status === "published" ? "success" : "muted"}
                    >
                      {PUBLISH_STATUS_LABELS[badge.status]}
                    </BadgeChip>
                    <BadgeChip variant="muted" className="font-mono">
                      {badge.code}
                    </BadgeChip>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{badge.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Earned by: {CRITERIA_LABELS[badge.criteriaType]}
                    {describeConfig(badge, locations, trails)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${badge.name}`}
                    onClick={() => openEdit(badge)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete ${badge.name}`}
                    onClick={() => setDeleteTarget(badge)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit badge" : "New badge"}</DialogTitle>
            <DialogDescription>
              Visitors see the name, icon and description. The rule below is what earns it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {serverError ? (
              <Alert variant="destructive">
                <AlertTitle>Could not save</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="badge-name" label="Badge name" required error={form.formState.errors.name?.message}>
                <Input placeholder="Butterfly Explorer" maxLength={80} {...form.register("name")} />
              </FormField>

              <FormField
                id="badge-icon"
                label="Icon"
                required
                error={form.formState.errors.icon?.message}
                description="One emoji, e.g. 🦋"
              >
                <Input placeholder="🦋" maxLength={8} {...form.register("icon")} />
              </FormField>
            </div>

            <FormField
              id="badge-code"
              label="Code"
              required
              error={form.formState.errors.code?.message}
              description="A stable identifier: lowercase letters, numbers and underscores."
            >
              <Input placeholder="butterfly_explorer" maxLength={60} {...form.register("code")} />
            </FormField>

            <FormField
              id="badge-description"
              label="Description"
              required
              error={form.formState.errors.description?.message}
              description="What the visitor did to earn it, in friendly words."
            >
              <Textarea
                rows={2}
                maxLength={400}
                placeholder="You completed a whole place in the Animals category."
                {...form.register("description")}
              />
            </FormField>

            <FormField
              id="badge-criteria"
              label="Earned by"
              required
              error={form.formState.errors.criteriaType?.message}
              description={CRITERIA_HINTS[criteriaType]}
            >
              <Select
                value={criteriaType}
                onValueChange={(value) => {
                  form.setValue("criteriaType", value as BadgeInput["criteriaType"], {
                    shouldValidate: true,
                  });
                  form.setValue("config", {}, { shouldValidate: false });
                }}
              >
                <SelectTrigger id="badge-criteria" aria-label="Badge criteria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {badgeCriteriaTypes.map((value) => (
                    <SelectItem key={value} value={value}>
                      {CRITERIA_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-medium">Rule details</legend>

              {COUNT_CRITERIA.includes(criteriaType) || criteriaType === "category_completed" ? (
                <FormField
                  id="badge-count"
                  label="How many"
                  required
                  error={form.formState.errors.config?.count?.message}
                >
                  <Input
                    id="badge-count"
                    type="number"
                    min={1}
                    max={9999}
                    value={config.count ?? ""}
                    onChange={(event) => setConfig({ count: Number(event.target.value) || undefined })}
                  />
                </FormField>
              ) : null}

              {criteriaType === "category_completed" ? (
                <FormField
                  id="badge-category"
                  label="Category"
                  required
                  error={form.formState.errors.config?.category?.message}
                >
                  <Select
                    value={config.category ?? ""}
                    onValueChange={(value) => setConfig({ category: value as LocationCategory })}
                  >
                    <SelectTrigger id="badge-category" aria-label="Category">
                      <SelectValue placeholder="Choose a category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_CATEGORIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {LOCATION_CATEGORY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : null}

              {criteriaType === "trail_completed" ? (
                <FormField
                  id="badge-trail"
                  label="Trail"
                  required
                  error={form.formState.errors.config?.trailSlug?.message}
                >
                  <Select
                    value={config.trailSlug ?? ""}
                    onValueChange={(value) => {
                      const trail = trails.find((item) => item.slug === value);
                      if (trail) setConfig({ trailSlug: trail.slug });
                    }}
                  >
                    <SelectTrigger id="badge-trail" aria-label="Trail">
                      <SelectValue placeholder="Choose a trail…" />
                    </SelectTrigger>
                    <SelectContent>
                      {trails.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No trails yet
                        </SelectItem>
                      ) : (
                        trails.map((trail) => (
                          <SelectItem key={trail.id} value={trail.slug}>
                            {trail.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : null}

              {criteriaType === "location_completed" ? (
                <FormField
                  id="badge-location"
                  label="Garden place"
                  required
                  error={form.formState.errors.config?.locationSlug?.message}
                >
                  <Select
                    value={config.locationSlug ?? ""}
                    onValueChange={(value) => setConfig({ locationSlug: value })}
                  >
                    <SelectTrigger id="badge-location" aria-label="Garden place">
                      <SelectValue placeholder="Choose a place…" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No places yet
                        </SelectItem>
                      ) : (
                        locations.map((location) => (
                          <SelectItem key={location.id} value={location.slug}>
                            {location.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : null}

              {criteriaType === "quiz_accuracy" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="badge-accuracy"
                    label="Accuracy (%)"
                    required
                    error={form.formState.errors.config?.accuracyPercent?.message}
                  >
                    <Input
                      id="badge-accuracy"
                      type="number"
                      min={1}
                      max={100}
                      value={config.accuracyPercent ?? ""}
                      onChange={(event) =>
                        setConfig({ accuracyPercent: Number(event.target.value) || undefined })
                      }
                    />
                  </FormField>
                  <FormField
                    id="badge-min-questions"
                    label="Minimum answered questions"
                    required
                    error={form.formState.errors.config?.minQuestions?.message}
                  >
                    <Input
                      id="badge-min-questions"
                      type="number"
                      min={1}
                      max={500}
                      value={config.minQuestions ?? ""}
                      onChange={(event) =>
                        setConfig({ minQuestions: Number(event.target.value) || undefined })
                      }
                    />
                  </FormField>
                </div>
              ) : null}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="badge-order"
                label="Display order"
                error={form.formState.errors.displayOrder?.message}
              >
                <Input type="number" min={0} max={9999} {...form.register("displayOrder")} />
              </FormField>

              <FormField
                id="badge-status"
                label="Status"
                error={form.formState.errors.status?.message}
                description="Only published badges are shown to visitors."
              >
                <Select
                  value={status}
                  onValueChange={(value) =>
                    form.setValue("status", value as PublishStatus, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="badge-status" aria-label="Status">
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
                {editing ? "Save badge" : "Create badge"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(openState) => {
          if (!openState) setDeleteTarget(null);
        }}
        pending={busy}
        title={`Delete ${deleteTarget?.name ?? "this badge"}?`}
        description="Visitors who already earned it keep it in their local progress, but it will no longer appear in the badge list or be awarded again."
        confirmLabel="Delete badge"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}

function describeConfig(
  badge: AdminBadge,
  locations: { slug: string; name: string }[],
  trails: { slug: string; name: string }[],
): string {
  const config = badge.config ?? {};

  switch (badge.criteriaType) {
    case "trail_completed": {
      const trail = trails.find((item) => item.slug === config.trailSlug);
      return ` — ${trail?.name ?? config.trailSlug ?? "unknown trail"}`;
    }
    case "location_completed": {
      const location = locations.find((item) => item.slug === config.locationSlug);
      return ` — ${location?.name ?? config.locationSlug ?? "unknown place"}`;
    }
    case "category_completed":
      return ` — ${config.count ?? "?"} in ${config.category ? LOCATION_CATEGORY_LABELS[config.category as LocationCategory] : "any category"}`;
    case "quiz_accuracy":
      return ` — ${config.accuracyPercent ?? "?"}% over at least ${config.minQuestions ?? "?"} questions`;
    default:
      return config.count ? ` — ${config.count}` : "";
  }
}

function emptyBadge(order: number): BadgeInput {
  return {
    code: "",
    name: "",
    description: "",
    icon: "🏅",
    criteriaType: "locations_completed",
    config: { count: 1 },
    displayOrder: order,
    status: "published",
  };
}
