"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Info, Plus, Route, Save, Trash2 } from "lucide-react";

import { saveTrailStopsAction } from "@/lib/actions/admin-trails";
import type { PublishStatus } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

export interface BuilderStop {
  /** Stable client key. */
  key: string;
  locationId: string;
  instructionToNext: string;
}

export interface BuilderLocation {
  id: string;
  name: string;
  slug: string;
  status: PublishStatus;
  category: string;
}

interface TrailBuilderProps {
  trailId: string;
  trailName: string;
  initialStops: BuilderStop[];
  locations: BuilderLocation[];
}

/**
 * Drag-and-drop trail builder.
 *
 * Positions are never edited by hand: the submitted order *is* the stop order
 * and the server recalculates 1..N from it, so the `(trail_id, position)` unique
 * index can never be violated and no gaps can appear.
 *
 * Pointer and keyboard sensors are both enabled, so stops can be reordered
 * without a mouse.
 */
export function TrailBuilder({
  trailId,
  trailName,
  initialStops,
  locations,
}: TrailBuilderProps) {
  const router = useRouter();
  const [stops, setStops] = React.useState<BuilderStop[]>(initialStops);
  const [selectedLocation, setSelectedLocation] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // dnd-kit otherwise numbers its accessibility ids from a global counter,
  // which differs between the server render and the browser (hydration error).
  const dndId = React.useId();

  const available = locations.filter(
    (location) => !stops.some((stop) => stop.locationId === location.id),
  );

  const byId = React.useMemo(() => {
    const map = new Map<string, BuilderLocation>();
    for (const location of locations) map.set(location.id, location);
    return map;
  }, [locations]);

  function markDirty() {
    setDirty(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setStops((items) => {
      const oldIndex = items.findIndex((item) => item.key === active.id);
      const newIndex = items.findIndex((item) => item.key === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
    markDirty();
  }

  function addStop() {
    if (!selectedLocation) {
      toast.warning("Choose a place to add");
      return;
    }
    setStops((previous) => [
      ...previous,
      { key: `new-${selectedLocation}-${Date.now()}`, locationId: selectedLocation, instructionToNext: "" },
    ]);
    setSelectedLocation("");
    markDirty();
  }

  async function save() {
    if (stops.length === 0) {
      toast.warning("Add at least one stop", "A trail needs at least one garden place.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveTrailStopsAction({
        trailId,
        stops: stops.map((stop) => ({
          locationId: stop.locationId,
          instructionToNext: stop.instructionToNext,
        })),
      });

      if (!result.ok) {
        toast.error("Could not save the trail", result.message);
        return;
      }

      toast.success("Trail saved", `${result.data.count} stops in order.`);
      setDirty(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const missingInstructions = stops
    .slice(0, -1)
    .filter((stop) => stop.instructionToNext.trim().length < 10).length;

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="add-stop" className="text-sm font-medium">
              Add a garden place
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a place, then drag the rows into the order visitors should walk them.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="add-stop" className="w-full sm:w-72" aria-label="Garden place">
                  <SelectValue placeholder="Choose a place…" />
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Every place is already on this trail
                    </SelectItem>
                  ) : (
                    available.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                        {location.status !== "published" ? " (unpublished)" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addStop} disabled={!selectedLocation}>
                <Plus aria-hidden="true" />
                Add stop
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
            <Button type="button" onClick={save} loading={saving} loadingLabel="Saving…">
              <Save aria-hidden="true" />
              Save order and instructions
            </Button>
          </div>
        </div>
      </Card>

      {missingInstructions > 0 ? (
        <Alert variant="warning">
          <Info aria-hidden="true" />
          <div>
            <AlertTitle>Written directions are missing</AlertTitle>
            <AlertDescription>
              {missingInstructions} stop{missingInstructions === 1 ? "" : "s"} ha
              {missingInstructions === 1 ? "s" : "ve"} no written directions to the next place.
              Visitors have no map — these words are the only navigation they get, and a trail cannot
              be published without them.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {stops.length === 0 ? (
        <EmptyState
          icon={<Route className="size-5" aria-hidden="true" />}
          title="This trail has no stops yet"
          description="Add garden places above and arrange them in walking order. Each stop gets written directions to the next one."
        />
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={stops.map((stop) => stop.key)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-3">
              {stops.map((stop, index) => (
                <SortableStopRow
                  key={stop.key}
                  stop={stop}
                  index={index}
                  total={stops.length}
                  location={byId.get(stop.locationId)}
                  onChange={(instruction) => {
                    setStops((previous) =>
                      previous.map((item) =>
                        item.key === stop.key ? { ...item, instructionToNext: instruction } : item,
                      ),
                    );
                    markDirty();
                  }}
                  onRemove={() => {
                    setStops((previous) => previous.filter((item) => item.key !== stop.key));
                    markDirty();
                  }}
                  nextLocationName={
                    stops[index + 1] ? byId.get(stops[index + 1].locationId)?.name ?? null : null
                  }
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <Card className="p-5">
        <h2 className="font-heading text-sm font-semibold">How publishing works</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
          <li>
            • A trail can only be published when every stop is a published location and every stop
            except the last has written directions.
          </li>
          <li>
            • The same garden place can appear in several trails. One printed QR sign serves them all.
          </li>
          <li>
            • Visitors who scan a later stop out of order are never blocked — the arrival screen
            simply tells them which stop they found.
          </li>
          <li className="font-medium text-foreground">• {trailName}</li>
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sortable row
 * ------------------------------------------------------------------ */

function SortableStopRow({
  stop,
  index,
  total,
  location,
  nextLocationName,
  onChange,
  onRemove,
}: {
  stop: BuilderStop;
  index: number;
  total: number;
  location: BuilderLocation | undefined;
  nextLocationName: string | null;
  onChange: (instruction: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.key,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  const isLast = index === total - 1;
  const shortInstruction = stop.instructionToNext.trim().length < 10;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start"
    >
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="cursor-grab rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label={`Reorder stop ${index + 1}: ${location?.name ?? "unknown place"}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" aria-hidden="true" />
        </button>
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground"
        >
          {index + 1}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{location?.name ?? "Unknown place"}</span>
          {location?.status !== "published" ? (
            <Badge variant="warning">Location is {location?.status ?? "missing"}</Badge>
          ) : null}
        </div>

        {isLast ? (
          <p className="mt-2 rounded-lg bg-[#fdf8ec] px-3 py-2 text-xs text-[#7a5a10]">
            Final stop — the trail completes here, so no directions are needed.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            <label
              htmlFor={`instruction-${stop.key}`}
              className="text-xs font-medium text-muted-foreground"
            >
              How to reach {nextLocationName ?? "the next stop"}
            </label>
            <Textarea
              id={`instruction-${stop.key}`}
              value={stop.instructionToNext}
              maxLength={600}
              rows={2}
              placeholder="Walk along the walkway towards the play area and look for the Swing & Slide Science sign."
              onChange={(event) => onChange(event.target.value)}
              aria-invalid={shortInstruction || undefined}
            />
            {shortInstruction ? (
              <p className="text-xs font-medium text-warning">
                Add clear walking directions — this is what replaces a map.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          aria-label={`Remove stop ${index + 1}`}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
