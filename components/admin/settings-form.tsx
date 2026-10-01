"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { RotateCcw, Save } from "lucide-react";

import { updateSettingsAction } from "@/lib/actions/admin-settings";
import { settingsSchema, type SettingsInput } from "@/lib/validation/settings";
import type { PublishStatus } from "@/lib/constants";
import { formResolver } from "@/lib/forms";
import { MediaPicker } from "@/components/admin/media-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

interface SettingsFormProps {
  defaultValues: {
    name: string;
    description: string;
    siteTitle: string;
    seoDescription: string;
    primaryColor: string;
    logoUrl: string;
    logoPublicId: string;
    faviconUrl: string;
    faviconPublicId: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    defaultTrailId: string;
    analyticsEnabled: boolean;
    privacyNotes: string;
  };
  trails: { id: string; name: string; status: PublishStatus }[];
}

/**
 * Site settings.
 *
 * Everything here is stored in the database and read at request time by the
 * root layout, so rebranding the garden — name, colour, logo, favicon, contact
 * details, SEO copy — never needs a code change or a deploy.
 */
export function SettingsForm({ defaultValues, trails }: SettingsFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [logo, setLogo] = React.useState({
    url: defaultValues.logoUrl || null,
    publicId: defaultValues.logoPublicId || null,
  });
  const [favicon, setFavicon] = React.useState({
    url: defaultValues.faviconUrl || null,
    publicId: defaultValues.faviconPublicId || null,
  });

  const form = useForm<SettingsInput>({
    resolver: formResolver<SettingsInput>(settingsSchema),
    defaultValues: {
      name: defaultValues.name,
      description: defaultValues.description,
      siteTitle: defaultValues.siteTitle,
      seoDescription: defaultValues.seoDescription,
      primaryColor: defaultValues.primaryColor,
      logoUrl: defaultValues.logoUrl,
      logoPublicId: defaultValues.logoPublicId,
      faviconUrl: defaultValues.faviconUrl,
      faviconPublicId: defaultValues.faviconPublicId,
      contactEmail: defaultValues.contactEmail || null,
      contactPhone: defaultValues.contactPhone,
      contactAddress: defaultValues.contactAddress,
      defaultTrailId: defaultValues.defaultTrailId || null,
      analyticsEnabled: defaultValues.analyticsEnabled,
      privacyNotes: defaultValues.privacyNotes || null,
    },
  });

  const analyticsEnabled = useWatch({ control: form.control, name: "analyticsEnabled" });
  const defaultTrailId = useWatch({ control: form.control, name: "defaultTrailId" }) ?? "";
  const primaryColor = useWatch({ control: form.control, name: "primaryColor" });

  async function onSubmit(values: SettingsInput) {
    setServerError(null);

    const result = await updateSettingsAction({
      ...values,
      logoUrl: logo.url ?? "",
      logoPublicId: logo.publicId ?? "",
      faviconUrl: favicon.url ?? "",
      faviconPublicId: favicon.publicId ?? "",
      contactEmail: values.contactEmail || null,
      defaultTrailId: values.defaultTrailId || null,
      privacyNotes: values.privacyNotes || null,
      contactPhone: values.contactPhone || null,
      contactAddress: values.contactAddress || null,
    });

    if (!result.ok) {
      setServerError(result.message);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof SettingsInput, { message: messages[0] });
        }
      }
      toast.error("Could not save settings", result.message);
      return;
    }

    toast.success("Settings saved", "The public site has been updated.");
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

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-heading text-base font-semibold">Garden identity</h2>

        <FormField id="settings-name" label="Garden name" required error={form.formState.errors.name?.message}>
          <Input maxLength={120} {...form.register("name")} />
        </FormField>

        <FormField
          id="settings-description"
          label="Garden description"
          error={form.formState.errors.description?.message}
          description="Shown on the about page and in the footer."
        >
          <Textarea rows={3} maxLength={2000} {...form.register("description")} />
        </FormField>

        <MediaPicker
          id="settings-logo"
          label="Logo"
          description="A square or wide logo shown in the site header. Transparent PNG or SVG works best."
          value={logo.url}
          publicId={logo.publicId}
          folder="branding"
          onChange={(next) => {
            setLogo(next);
            form.setValue("logoUrl", next.url ?? "");
            form.setValue("logoPublicId", next.publicId ?? "");
          }}
        />

        <MediaPicker
          id="settings-favicon"
          label="Favicon"
          description="The small icon shown in browser tabs and when the site is added to a home screen."
          value={favicon.url}
          publicId={favicon.publicId}
          folder="branding"
          onChange={(next) => {
            setFavicon(next);
            form.setValue("faviconUrl", next.url ?? "");
            form.setValue("faviconPublicId", next.publicId ?? "");
          }}
        />

        <FormField
          id="settings-color"
          label="Brand colour"
          required
          error={form.formState.errors.primaryColor?.message}
          description="Used for buttons, links and highlights across the public site."
        >
          {(control) => (
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-10 shrink-0 rounded-lg border border-border"
                style={{ backgroundColor: primaryColor }}
              />
              <Input {...control} className="max-w-40" maxLength={7} {...form.register("primaryColor")} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.setValue("primaryColor", "#2F6B4F", { shouldValidate: true })}
              >
                <RotateCcw aria-hidden="true" />
                Reset
              </Button>
            </div>
          )}
        </FormField>
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-heading text-base font-semibold">Contact details</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          These are shown on the privacy page so visitors have a real way to reach the garden. Leave
          them blank and no contact section is shown.
        </p>

        <FormField
          id="settings-email"
          label="Contact email"
          error={form.formState.errors.contactEmail?.message}
        >
          <Input type="email" maxLength={200} {...form.register("contactEmail")} />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="settings-phone" label="Phone" error={form.formState.errors.contactPhone?.message}>
            <Input maxLength={40} {...form.register("contactPhone")} />
          </FormField>

          <FormField
            id="settings-address"
            label="Address"
            error={form.formState.errors.contactAddress?.message}
          >
            <Input maxLength={300} {...form.register("contactAddress")} />
          </FormField>
        </div>
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-heading text-base font-semibold">SEO and defaults</h2>

        <FormField
          id="settings-site-title"
          label="Site title"
          required
          error={form.formState.errors.siteTitle?.message}
          description="Appears in browser tabs and search results."
        >
          <Input maxLength={120} {...form.register("siteTitle")} />
        </FormField>

        <FormField
          id="settings-seo"
          label="Search description"
          required
          error={form.formState.errors.seoDescription?.message}
          description="One or two sentences describing the garden for search engines."
        >
          <Textarea rows={3} maxLength={300} {...form.register("seoDescription")} />
        </FormField>

        <FormField
          id="settings-default-trail"
          label="Default trail"
          error={form.formState.errors.defaultTrailId?.message}
          description="Suggested to visitors who scan a sign with no primary trail. Only published trails can be chosen."
        >
          <Select
            value={defaultTrailId || "__none"}
            onValueChange={(value) =>
              form.setValue("defaultTrailId", value === "__none" ? null : value, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="settings-default-trail" aria-label="Default trail">
              <SelectValue placeholder="No default trail" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">No default trail</SelectItem>
              {trails.map((trail) => (
                <SelectItem key={trail.id} value={trail.id} disabled={trail.status !== "published"}>
                  {trail.name}
                  {trail.status !== "published" ? " (not published)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-heading text-base font-semibold">Privacy and analytics</h2>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Anonymous analytics</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Records scans, views, activity completions and quiz answers against a garden place — and
              nothing that identifies a person. No names, emails, GPS positions or IP addresses.
            </p>
          </div>
          <Switch
            checked={analyticsEnabled}
            onCheckedChange={(checked) =>
              form.setValue("analyticsEnabled", checked, { shouldValidate: true })
            }
            aria-label="Record anonymous analytics"
          />
        </div>

        <FormField
          id="settings-privacy-notes"
          label="Extra privacy notes"
          error={form.formState.errors.privacyNotes?.message}
          description="Anything garden-specific visitors should know. Shown on the privacy page exactly as written — do not claim data practices that are not implemented."
        >
          <Textarea rows={4} maxLength={4000} {...form.register("privacyNotes")} />
        </FormField>
      </Card>

      <div>
        <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
          <Save aria-hidden="true" />
          Save settings
        </Button>
      </div>
    </form>
  );
}
