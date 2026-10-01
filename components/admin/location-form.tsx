"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Save } from "lucide-react";

import {
  createLocationAction,
  updateLocationAction,
} from "@/lib/actions/admin-locations";
import {
  LOCATION_CATEGORIES,
  LOCATION_CATEGORY_ICONS,
  LOCATION_CATEGORY_LABELS,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
} from "@/lib/constants";
import { createLocationSchema, type CreateLocationInput } from "@/lib/validation/location";
import { slugify } from "@/lib/utils";
import { formResolver } from "@/lib/forms";
import { MediaPicker } from "@/components/admin/media-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

export interface LocationFormValues extends CreateLocationInput {
  id?: string;
}

interface LocationFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<LocationFormValues>;
}

/**
 * Shared admin form for creating and editing a garden place.
 * Validated with the same Zod schema the server action uses, so the messages a
 * user sees match the server's rules exactly.
 */
export function LocationForm({ mode, defaultValues }: LocationFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(mode === "edit");
  const [heroImage, setHeroImage] = React.useState({
    url: defaultValues?.heroImageUrl ?? null,
    publicId: defaultValues?.heroImagePublicId ?? null,
  });

  const form = useForm<LocationFormValues>({
    resolver: formResolver<LocationFormValues>(createLocationSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      slug: defaultValues?.slug ?? "",
      shortDescription: defaultValues?.shortDescription ?? "",
      description: defaultValues?.description ?? "",
      category: defaultValues?.category ?? "plants",
      heroImageUrl: defaultValues?.heroImageUrl ?? null,
      heroImagePublicId: defaultValues?.heroImagePublicId ?? null,
      heroImageAlt: defaultValues?.heroImageAlt ?? "",
      icon: defaultValues?.icon ?? "",
      estimatedMinutes: defaultValues?.estimatedMinutes ?? 5,
      status: defaultValues?.status ?? "draft",
      featured: defaultValues?.featured ?? false,
      displayOrder: defaultValues?.displayOrder ?? 0,
    },
  });

  const name = useWatch({ control: form.control, name: "name" });
  const featured = useWatch({ control: form.control, name: "featured" });
  const status = useWatch({ control: form.control, name: "status" });
  const category = useWatch({ control: form.control, name: "category" });
  const heroImageAlt = useWatch({ control: form.control, name: "heroImageAlt" });

  React.useEffect(() => {
    if (!slugTouched && name) {
      form.setValue("slug", slugify(name), { shouldValidate: false });
    }
  }, [name, slugTouched, form]);

  async function onSubmit(values: LocationFormValues) {
    setServerError(null);

    const payload = {
      ...values,
      heroImageUrl: heroImage.url ?? "",
      heroImagePublicId: heroImage.publicId ?? "",
      icon: values.icon || "",
      heroImageAlt: values.heroImageAlt || "",
    };

    const result =
      mode === "create"
        ? await createLocationAction(payload)
        : await updateLocationAction({ ...payload, id: defaultValues?.id });

    if (!result.ok) {
      setServerError(result.message);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (field === "form") continue;
          form.setError(field as keyof LocationFormValues, { message: messages[0] });
        }
      }
      toast.error("Could not save this place", result.message);
      return;
    }

    toast.success(mode === "create" ? "Location created" : "Location saved");
    router.push("/admin/locations");
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
          <h2 className="font-heading text-base font-semibold">Basics</h2>

          <FormField
            id="name"
            label="Place name"
            required
            error={form.formState.errors.name?.message}
            description="Shown on cards, on the arrival screen and on printed signs."
          >
            <Input placeholder="Butterfly Watch" {...form.register("name")} />
          </FormField>

          <FormField
            id="slug"
            label="URL slug"
            required
            error={form.formState.errors.slug?.message}
            description="Used in the public address, for example /locations/butterfly-garden"
          >
            <Input
              placeholder="butterfly-garden"
              {...form.register("slug", {
                onChange: () => setSlugTouched(true),
              })}
            />
          </FormField>

          <FormField
            id="shortDescription"
            label="Short description"
            error={form.formState.errors.shortDescription?.message}
            description="One sentence, up to 240 characters. Used on cards and after a QR scan."
          >
            <Textarea
              rows={2}
              maxLength={240}
              placeholder="Discover how butterflies, flowers and pollination are connected."
              {...form.register("shortDescription")}
            />
          </FormField>

          <FormField
            id="description"
            label="About this place"
            error={form.formState.errors.description?.message}
            description="The main learning text. Leave a blank line between paragraphs."
          >
            <Textarea rows={7} placeholder="What makes this place worth stopping at…" {...form.register("description")} />
          </FormField>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-5 p-5">
            <h2 className="font-heading text-base font-semibold">Publishing</h2>

            <FormField id="status" label="Status" error={form.formState.errors.status?.message}>
              <Select
                value={status}
                onValueChange={(value) =>
                  form.setValue("status", value as LocationFormValues["status"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="status" aria-label="Publication status">
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

            <div className="flex items-start gap-3">
              <Checkbox
                id="featured"
                checked={featured}
                onCheckedChange={(checked) =>
                  form.setValue("featured", checked === true, { shouldValidate: true })
                }
              />
              <div>
                <label htmlFor="featured" className="text-sm font-medium">
                  Feature on the home page
                </label>
                <p className="text-xs text-muted-foreground">
                  Featured places are shown first in the garden highlights.
                </p>
              </div>
            </div>

            <FormField
              id="estimatedMinutes"
              label="Time to explore (minutes)"
              error={form.formState.errors.estimatedMinutes?.message}
            >
              <Input type="number" min={1} max={240} {...form.register("estimatedMinutes")} />
            </FormField>

            <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              Visitors only ever see published content. Draft and archived places stay invisible
              until you publish them.
            </p>
          </Card>

          <Card className="flex flex-col gap-5 p-5">
            <h2 className="font-heading text-base font-semibold">Category and icon</h2>

            <FormField
              id="category"
              label="Educational category"
              error={form.formState.errors.category?.message}
            >
              <Select
                value={category}
                onValueChange={(value) =>
                  form.setValue("category", value as LocationFormValues["category"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="category" aria-label="Educational category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {LOCATION_CATEGORY_ICONS[value]} {LOCATION_CATEGORY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="icon"
              label="Card icon"
              error={form.formState.errors.icon?.message}
              description="A single emoji shown when no photo has been uploaded."
            >
              <Input placeholder="🦋" maxLength={8} {...form.register("icon")} />
            </FormField>
          </Card>
        </div>
      </div>

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-heading text-base font-semibold">Hero image</h2>
        <MediaPicker
          id="hero-image"
          label="Hero image"
          description="Shown behind the place name. Landscape photos work best."
          value={heroImage.url}
          publicId={heroImage.publicId}
          alt={heroImageAlt}
          folder="locations"
          onChange={(next) => {
            setHeroImage(next);
            form.setValue("heroImageUrl", next.url ?? "");
            form.setValue("heroImagePublicId", next.publicId ?? "");
            if (next.alt && !heroImageAlt) form.setValue("heroImageAlt", next.alt);
          }}
        />
        <FormField
          id="heroImageAlt"
          label="Image description (alt text)"
          error={form.formState.errors.heroImageAlt?.message}
          description="Describe the photo for visitors using a screen reader."
        >
          <Input placeholder="Orange and black butterflies on purple buddleia flowers" {...form.register("heroImageAlt")} />
        </FormField>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
          <Save aria-hidden="true" />
          {mode === "create" ? "Create location" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            router.push("/admin/locations");
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
