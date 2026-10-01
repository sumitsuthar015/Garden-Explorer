"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Save } from "lucide-react";

import { createTrailAction, updateTrailAction } from "@/lib/actions/admin-trails";
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
  TRAIL_DIFFICULTIES,
  TRAIL_DIFFICULTY_LABELS,
} from "@/lib/constants";
import { trailSchema, type TrailInput } from "@/lib/validation/trail";
import { slugify } from "@/lib/utils";
import { formResolver } from "@/lib/forms";
import { MediaPicker } from "@/components/admin/media-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

interface TrailFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<TrailInput>;
}

/** Shared admin form for a learning trail. Stops are managed in the builder. */
export function TrailForm({ mode, defaultValues }: TrailFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(mode === "edit");
  const [cover, setCover] = React.useState({
    url: defaultValues?.coverImageUrl ?? null,
    publicId: defaultValues?.coverImagePublicId ?? null,
  });

  const form = useForm<TrailInput>({
    resolver: formResolver<TrailInput>(trailSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      slug: defaultValues?.slug ?? "",
      description: defaultValues?.description ?? "",
      goals: defaultValues?.goals ?? "",
      difficulty: defaultValues?.difficulty ?? "easy",
      ageGroup: defaultValues?.ageGroup ?? "all-ages",
      estimatedMinutes: defaultValues?.estimatedMinutes ?? 45,
      coverImageUrl: defaultValues?.coverImageUrl ?? "",
      coverImagePublicId: defaultValues?.coverImagePublicId ?? "",
      coverImageAlt: defaultValues?.coverImageAlt ?? "",
      icon: defaultValues?.icon ?? "",
      status: defaultValues?.status ?? "draft",
      displayOrder: defaultValues?.displayOrder ?? 0,
    },
  });

  const name = useWatch({ control: form.control, name: "name" });
  const difficulty = useWatch({ control: form.control, name: "difficulty" });
  const ageGroup = useWatch({ control: form.control, name: "ageGroup" });
  const status = useWatch({ control: form.control, name: "status" });
  const coverImageAlt = useWatch({ control: form.control, name: "coverImageAlt" });

  React.useEffect(() => {
    if (!slugTouched && name) form.setValue("slug", slugify(name), { shouldValidate: false });
  }, [name, slugTouched, form]);

  async function onSubmit(values: TrailInput) {
    setServerError(null);

    const payload = {
      ...values,
      id: defaultValues?.id,
      coverImageUrl: cover.url ?? "",
      coverImagePublicId: cover.publicId ?? "",
      coverImageAlt: values.coverImageAlt || "",
      icon: values.icon || "",
      themeColor: values.themeColor || "",
    };

    const result =
      mode === "create" ? await createTrailAction(payload) : await updateTrailAction(payload);

    if (!result.ok) {
      setServerError(result.message);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (field === "form") continue;
          form.setError(field as keyof TrailInput, { message: messages[0] });
        }
      }
      toast.error("Could not save this trail", result.message);
      return;
    }

    toast.success(mode === "create" ? "Trail created" : "Trail saved");
    router.push(`/admin/trails/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <Save aria-hidden="true" />
          <div>
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col gap-5 p-5">
          <h2 className="font-heading text-base font-semibold">Trail basics</h2>

          <FormField id="trail-name" label="Trail name" required error={form.formState.errors.name?.message}>
            <Input placeholder="Garden Science Trail" {...form.register("name")} />
          </FormField>

          <FormField
            id="trail-slug"
            label="URL slug"
            required
            error={form.formState.errors.slug?.message}
            description="Public address: /trails/garden-science-trail"
          >
            <Input
              placeholder="garden-science-trail"
              {...form.register("slug", { onChange: () => setSlugTouched(true) })}
            />
          </FormField>

          <FormField
            id="trail-description"
            label="Description"
            error={form.formState.errors.description?.message}
            description="What the trail covers and who it suits."
          >
            <Textarea rows={4} maxLength={2000} {...form.register("description")} />
          </FormField>

          <FormField
            id="trail-goals"
            label="Learning goals"
            error={form.formState.errors.goals?.message}
            description="One goal per line. Each line becomes a bullet on the trail page."
          >
            <Textarea
              rows={5}
              maxLength={1200}
              placeholder={"Understand how pollination works\nRecognise three pollinating insects"}
              {...form.register("goals")}
            />
          </FormField>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-5 p-5">
            <h2 className="font-heading text-base font-semibold">Suitability</h2>

            <FormField id="trail-difficulty" label="Difficulty" error={form.formState.errors.difficulty?.message}>
              <Select
                value={difficulty}
                onValueChange={(value) =>
                  form.setValue("difficulty", value as TrailInput["difficulty"], { shouldValidate: true })
                }
              >
                <SelectTrigger id="trail-difficulty" aria-label="Difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAIL_DIFFICULTIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {TRAIL_DIFFICULTY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField id="trail-age" label="Age group" error={form.formState.errors.ageGroup?.message}>
              <Select
                value={ageGroup}
                onValueChange={(value) =>
                  form.setValue("ageGroup", value as TrailInput["ageGroup"], { shouldValidate: true })
                }
              >
                <SelectTrigger id="trail-age" aria-label="Age group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUPS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {AGE_GROUP_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="trail-minutes"
              label="Approximate duration (minutes)"
              error={form.formState.errors.estimatedMinutes?.message}
            >
              <Input type="number" min={5} max={600} {...form.register("estimatedMinutes")} />
            </FormField>

            <FormField id="trail-status" label="Status" error={form.formState.errors.status?.message}>
              <Select
                value={status}
                onValueChange={(value) =>
                  form.setValue("status", value as TrailInput["status"], { shouldValidate: true })
                }
              >
                <SelectTrigger id="trail-status" aria-label="Status">
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

            <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              Publishing is validated: the trail needs at least one stop, every stop must be a
              published location, and every stop except the last needs written directions.
            </p>
          </Card>

          <Card className="flex flex-col gap-5 p-5">
            <h2 className="font-heading text-base font-semibold">Presentation</h2>

            <FormField
              id="trail-icon"
              label="Trail icon"
              error={form.formState.errors.icon?.message}
              description="A single emoji used when no cover photo exists."
            >
              <Input placeholder="🥾" maxLength={8} {...form.register("icon")} />
            </FormField>

            <FormField
              id="trail-order"
              label="Display order"
              error={form.formState.errors.displayOrder?.message}
            >
              <Input type="number" min={0} max={9999} {...form.register("displayOrder")} />
            </FormField>
          </Card>
        </div>
      </div>

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-heading text-base font-semibold">Cover image</h2>
        <MediaPicker
          id="trail-cover"
          label="Cover image"
          description="Shown on the trail card and at the top of the trail page."
          value={cover.url}
          publicId={cover.publicId}
          alt={coverImageAlt}
          folder="trails"
          onChange={(next) => {
            setCover(next);
            form.setValue("coverImageUrl", next.url ?? "");
            form.setValue("coverImagePublicId", next.publicId ?? "");
            if (next.alt && !coverImageAlt) form.setValue("coverImageAlt", next.alt);
          }}
        />
        <FormField
          id="trail-cover-alt"
          label="Image description (alt text)"
          error={form.formState.errors.coverImageAlt?.message}
        >
          <Input placeholder="Children walking the paved walkway towards Babasaheb's statue" {...form.register("coverImageAlt")} />
        </FormField>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
          <Save aria-hidden="true" />
          {mode === "create" ? "Create trail" : "Save trail"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/trails")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
