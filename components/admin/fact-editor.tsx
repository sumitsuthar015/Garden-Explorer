"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Plus, Save, Trash2 } from "lucide-react";

import type { LocationFact } from "@/db/schema";
import { deleteLocationFactAction, saveLocationFactAction } from "@/lib/actions/admin-locations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

interface FactEditorProps {
  locationId: string;
  facts: LocationFact[];
}

interface DraftFact {
  id?: string;
  label: string;
  value: string;
}

/**
 * Quick facts editor. Facts appear in a two-column definition list on the
 * location page, which is a good place for measurable details.
 */
export function FactEditor({ locationId, facts }: FactEditorProps) {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<DraftFact[]>(
    facts
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((fact) => ({ id: fact.id, label: fact.label, value: fact.value })),
  );
  const [savingIndex, setSavingIndex] = React.useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);

  function update(index: number, patch: Partial<DraftFact>) {
    setDrafts((previous) =>
      previous.map((draft, position) => (position === index ? { ...draft, ...patch } : draft)),
    );
  }

  async function save(index: number) {
    const draft = drafts[index];
    if (!draft.label.trim() || !draft.value.trim()) {
      toast.warning("Both a label and a value are needed");
      return;
    }

    setSavingIndex(index);
    try {
      const result = await saveLocationFactAction({
        id: draft.id,
        locationId,
        label: draft.label,
        value: draft.value,
        displayOrder: index,
      });

      if (!result.ok) {
        toast.error("Could not save this fact", result.message);
        return;
      }

      setDrafts((previous) =>
        previous.map((item, position) =>
          position === index ? { ...item, id: result.data.id } : item,
        ),
      );
      toast.success("Fact saved");
      router.refresh();
    } finally {
      setSavingIndex(null);
    }
  }

  async function confirmDelete() {
    if (deleteIndex === null) return;
    const draft = drafts[deleteIndex];

    if (!draft.id) {
      setDrafts((previous) => previous.filter((_, position) => position !== deleteIndex));
      setDeleteIndex(null);
      return;
    }

    setBusy(true);
    try {
      const result = await deleteLocationFactAction(draft.id);
      if (!result.ok) {
        toast.error("Could not delete this fact", result.message);
        return;
      }
      setDrafts((previous) => previous.filter((_, position) => position !== deleteIndex));
      toast.success("Fact deleted");
      setDeleteIndex(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">Quick facts</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Short labelled details shown in a grid, for example &quot;Height&quot; and &quot;Blooms
            in&quot;. Save each row individually.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setDrafts((previous) => [...previous, { label: "", value: "" }])}
        >
          <Plus aria-hidden="true" />
          Add fact
        </Button>
      </div>

      <div className="mt-4">
        {drafts.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="size-5" aria-hidden="true" />}
            title="No facts yet"
            description="Facts are optional, but a couple of concrete numbers make a place more memorable."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {drafts.map((draft, index) => (
              <li
                key={draft.id ?? `new-${index}`}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`fact-label-${index}`} className="text-xs font-medium text-muted-foreground">
                    Label
                  </label>
                  <Input
                    id={`fact-label-${index}`}
                    value={draft.label}
                    maxLength={80}
                    placeholder="Height"
                    onChange={(event) => update(index, { label: event.target.value })}
                  />
                </div>
                <div className="flex min-w-0 flex-[2] flex-col gap-1.5">
                  <label htmlFor={`fact-value-${index}`} className="text-xs font-medium text-muted-foreground">
                    Value
                  </label>
                  <Input
                    id={`fact-value-${index}`}
                    value={draft.value}
                    maxLength={240}
                    placeholder="Up to 4 metres in a good year"
                    onChange={(event) => update(index, { value: event.target.value })}
                  />
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    loading={savingIndex === index}
                    loadingLabel="Saving…"
                    onClick={() => void save(index)}
                  >
                    <Save aria-hidden="true" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete fact ${index + 1}`}
                    onClick={() => setDeleteIndex(index)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIndex(null);
        }}
        pending={busy}
        title="Delete this fact?"
        description="It is removed from the visitor's quick facts grid straight away."
        confirmLabel="Delete fact"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
