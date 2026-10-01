"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import type { LocationContentBlock } from "@/db/schema";
import {
  deleteContentBlockAction,
  reorderContentBlocksAction,
  saveContentBlockAction,
} from "@/lib/actions/admin-locations";
import {
  CONTENT_BLOCK_LABELS,
  CONTENT_BLOCK_TYPES,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
  type ContentBlockType,
  type PublishStatus,
} from "@/lib/constants";
import type { ContentBlockInput } from "@/lib/validation/location";
import { contentBlockSchemaWithRefinement } from "@/lib/validation/location";
import { moveItem } from "@/lib/utils";
import { formResolver } from "@/lib/forms";
import { MediaPicker } from "@/components/admin/media-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface ContentBlockEditorProps {
  locationId: string;
  blocks: LocationContentBlock[];
}

type FormValues = Omit<ContentBlockInput, "locationId">;

const MEDIA_TYPES: ContentBlockType[] = ["image", "video", "audio"];

/**
 * Content block editor.
 *
 * Admins edit plain labelled fields — never raw JSON. Reordering recalculates
 * positions on the server from the submitted id order, so the stored sequence
 * can never contain gaps or duplicates.
 */
export function ContentBlockEditor({ locationId, blocks }: ContentBlockEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<LocationContentBlock | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LocationContentBlock | null>(null);
  const [busy, setBusy] = React.useState(false);

  const ordered = React.useMemo(
    () => [...blocks].sort((a, b) => a.displayOrder - b.displayOrder),
    [blocks],
  );

  const form = useForm<FormValues>({
    resolver: formResolver<FormValues>(contentBlockSchemaWithRefinement),
    defaultValues: emptyValues(0),
  });

  const blockType = useWatch({ control: form.control, name: "type" });
  const status = useWatch({ control: form.control, name: "status" });
  const mediaAlt = useWatch({ control: form.control, name: "mediaAlt" });
  const needsMedia = MEDIA_TYPES.includes(blockType);
  const [media, setMedia] = React.useState({ url: null as string | null, publicId: null as string | null });

  function openCreate() {
    setEditing(null);
    setMedia({ url: null, publicId: null });
    form.reset(emptyValues(ordered.length));
    setDialogOpen(true);
  }

  function openEdit(block: LocationContentBlock) {
    setEditing(block);
    setMedia({ url: block.mediaUrl, publicId: block.mediaPublicId });
    form.reset({
      id: block.id,
      type: block.type,
      title: block.title ?? "",
      body: block.body,
      mediaUrl: block.mediaUrl ?? "",
      mediaPublicId: block.mediaPublicId ?? "",
      mediaAlt: block.mediaAlt ?? "",
      mediaCaption: block.mediaCaption ?? "",
      displayOrder: block.displayOrder,
      status: block.status,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const result = await saveContentBlockAction({
      ...values,
      locationId,
      mediaUrl: media.url ?? "",
      mediaPublicId: media.publicId ?? "",
      mediaAlt: values.mediaAlt || "",
      mediaCaption: values.mediaCaption || "",
      title: values.title || "",
    });

    if (!result.ok) {
      toast.error("Could not save this card", result.message);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof FormValues, { message: messages[0] });
        }
      }
      return;
    }

    toast.success(editing ? "Learning card updated" : "Learning card added");
    setDialogOpen(false);
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const next = moveItem(ordered, index, index + direction);
    if (next === ordered) return;

    setBusy(true);
    try {
      const result = await reorderContentBlocksAction({
        parentId: locationId,
        orderedIds: next.map((block) => block.id),
      });
      if (!result.ok) {
        toast.error("Could not reorder", result.message);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await deleteContentBlockAction(deleteTarget.id);
      if (!result.ok) {
        toast.error("Could not delete", result.message);
        return;
      }
      toast.success("Learning card deleted");
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
          <h2 className="font-heading text-base font-semibold">Learning cards</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Short, visual pieces of the lesson: facts, science discoveries, things to observe and
            things to think about. Order them the way a visitor should read them.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden="true" />
          Add card
        </Button>
      </div>

      <div className="mt-4">
        {ordered.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" aria-hidden="true" />}
            title="No learning cards yet"
            description="Add a card to explain what is special about this place. Even one short card makes the scan worthwhile."
            action={
              <Button onClick={openCreate}>
                <Plus aria-hidden="true" />
                Add the first card
              </Button>
            }
          />
        ) : (
          <ol className="flex flex-col gap-3">
            {ordered.map((block, index) => (
              <li
                key={block.id}
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
                    <Badge variant="soft">{CONTENT_BLOCK_LABELS[block.type]}</Badge>
                    {block.status === "draft" ? <Badge variant="warning">Draft</Badge> : null}
                    {block.mediaUrl ? (
                      <Badge variant="muted">
                        <ImageIcon className="size-3" aria-hidden="true" />
                        Media
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 font-medium">
                    {block.title?.trim() || "(no title)"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{block.body}</p>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${block.title ?? "card"} up`}
                    disabled={index === 0 || busy}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${block.title ?? "card"} down`}
                    disabled={index === ordered.length - 1 || busy}
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${block.title ?? "card"}`}
                    onClick={() => openEdit(block)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete ${block.title ?? "card"}`}
                    onClick={() => setDeleteTarget(block)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ------------------------------------------------ Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit learning card" : "Add learning card"}</DialogTitle>
            <DialogDescription>
              Cards appear in the order shown here. A card with an image needs alt text so screen
              readers can describe it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="block-type"
                label="Card type"
                required
                error={form.formState.errors.type?.message}
              >
                <Select
                  value={blockType}
                  onValueChange={(value) =>
                    form.setValue("type", value as ContentBlockType, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="block-type" aria-label="Card type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_BLOCK_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CONTENT_BLOCK_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="block-status"
                label="Published"
                error={form.formState.errors.status?.message}
              >
                <Select
                  value={status}
                  onValueChange={(value) =>
                    form.setValue("status", value as PublishStatus, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="block-status" aria-label="Card status">
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
              id="block-title"
              label="Title"
              error={form.formState.errors.title?.message}
              description="Leave blank to use the default heading for this card type."
            >
              <Input placeholder="Did You Know?" maxLength={160} {...form.register("title")} />
            </FormField>

            <FormField
              id="block-body"
              label="Content"
              error={form.formState.errors.body?.message}
              description="Plain text. Leave a blank line between paragraphs."
            >
              <Textarea rows={6} maxLength={6000} {...form.register("body")} />
            </FormField>

            {needsMedia ? (
              <>
                <MediaPicker
                  id="block-media"
                  label="Media file"
                  description={
                    blockType === "image"
                      ? "A photo or illustration for this card."
                      : "Upload the media file. Keep videos short — mobile visitors are often on garden wifi."
                  }
                  value={media.url}
                  publicId={media.publicId}
                  alt={mediaAlt}
                  folder="content"
                  onChange={(next) => {
                    setMedia(next);
                    form.setValue("mediaUrl", next.url ?? "");
                    form.setValue("mediaPublicId", next.publicId ?? "");
                  }}
                />
                <FormField
                  id="block-media-alt"
                  label="Media description (alt text)"
                  required
                  error={form.formState.errors.mediaAlt?.message}
                >
                  <Input placeholder="Close-up of dew on a rose petal" maxLength={240} {...form.register("mediaAlt")} />
                </FormField>
                <FormField id="block-media-caption" label="Caption" error={form.formState.errors.mediaCaption?.message}>
                  <Input placeholder="Optional caption shown under the media" maxLength={240} {...form.register("mediaCaption")} />
                </FormField>
              </>
            ) : null}

            <FormField
              id="block-order"
              label="Display order"
              error={form.formState.errors.displayOrder?.message}
              description="Lower numbers appear first. Use the arrow buttons in the list to reorder."
            >
              <Input type="number" min={0} max={9999} {...form.register("displayOrder")} />
            </FormField>

            {form.formState.errors.root?.message ? (
              <Alert variant="destructive">
                <AlertTitle>Please check the form</AlertTitle>
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
                {editing ? "Save card" : "Add card"}
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
        title="Delete this learning card?"
        description="The card is removed from the visitor's learning experience immediately. This cannot be undone."
        confirmLabel="Delete card"
        onConfirm={confirmDelete}
      />

      <p className="mt-4 inline-flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Keep cards short. Visitors are standing outdoors, often in bright sunlight, reading on a
        phone.
      </p>

      <p className="sr-only">
        <Eye aria-hidden="true" />
        Changes are saved to the live database and become visible to visitors as soon as the place is
        published.
      </p>
    </Card>
  );
}

function emptyValues(displayOrder: number): FormValues {
  return {
    type: "text",
    title: "",
    body: "",
    mediaUrl: "",
    mediaPublicId: "",
    mediaAlt: "",
    mediaCaption: "",
    displayOrder,
    status: "published",
  };
}
