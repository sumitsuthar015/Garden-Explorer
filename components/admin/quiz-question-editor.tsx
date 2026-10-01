"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CheckCircle2, HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";

import {
  deleteQuizQuestionAction,
  reorderQuizQuestionsAction,
  saveQuizQuestionAction,
} from "@/lib/actions/admin-quizzes";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_DIFFICULTY_LABELS,
  type QuestionDifficulty,
} from "@/lib/constants";
import { moveItem } from "@/lib/utils";
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

export interface EditableOption {
  id?: string;
  text: string;
  isCorrect: boolean;
}

export interface EditableQuestion {
  id: string;
  prompt: string;
  hint: string;
  explanation: string;
  points: number;
  difficulty: QuestionDifficulty;
  displayOrder: number;
  options: EditableOption[];
}

interface QuizQuestionEditorProps {
  quizId: string;
  questions: EditableQuestion[];
}

const MAX_OPTIONS = 6;

interface DraftState {
  prompt: string;
  hint: string;
  explanation: string;
  points: number;
  difficulty: QuestionDifficulty;
  options: EditableOption[];
}

/**
 * Quiz question editor.
 *
 * Correct answers are chosen with a radio group (never inferred from order) and
 * are re-validated on the server: exactly one correct option, at least two
 * distinct options. Wrong client state can therefore never corrupt a quiz.
 */
export function QuizQuestionEditor({ quizId, questions }: QuizQuestionEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<EditableQuestion | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<EditableQuestion | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const [draft, setDraft] = React.useState<DraftState>(emptyDraft);

  const ordered = React.useMemo(
    () => [...questions].sort((a, b) => a.displayOrder - b.displayOrder),
    [questions],
  );

  function openCreate() {
    setEditing(null);
    setFieldErrors({});
    setDraft(emptyDraft());
    setOpen(true);
  }

  function openEdit(question: EditableQuestion) {
    setEditing(question);
    setFieldErrors({});
    setDraft({
      prompt: question.prompt,
      hint: question.hint,
      explanation: question.explanation,
      points: question.points,
      difficulty: question.difficulty,
      options: question.options.length > 0 ? question.options : emptyDraft().options,
    });
    setOpen(true);
  }

  function setOption(index: number, patch: Partial<EditableOption>) {
    setDraft((previous) => ({
      ...previous,
      options: previous.options.map((option, position) =>
        position === index ? { ...option, ...patch } : option,
      ),
    }));
  }

  function markCorrect(index: number) {
    setDraft((previous) => ({
      ...previous,
      options: previous.options.map((option, position) => ({
        ...option,
        isCorrect: position === index,
      })),
    }));
  }

  function addOption() {
    setDraft((previous) =>
      previous.options.length >= MAX_OPTIONS
        ? previous
        : { ...previous, options: [...previous.options, { text: "", isCorrect: false }] },
    );
  }

  function removeOption(index: number) {
    setDraft((previous) => {
      if (previous.options.length <= 2) return previous;
      const next = previous.options.filter((_, position) => position !== index);
      // Never lose the correct answer when its row is removed.
      if (!next.some((option) => option.isCorrect)) next[0] = { ...next[0], isCorrect: true };
      return { ...previous, options: next };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    const payloadOptions = draft.options.filter((option) => option.text.trim().length > 0);

    if (draft.prompt.trim().length < 5) {
      setFieldErrors({ prompt: ["Write the question first"] });
      return;
    }
    if (payloadOptions.length < 2) {
      setFieldErrors({ options: ["Add at least two answer options"] });
      return;
    }
    if (payloadOptions.filter((option) => option.isCorrect).length !== 1) {
      setFieldErrors({ options: ["Mark exactly one option as the correct answer"] });
      return;
    }

    setBusy(true);
    try {
      const result = await saveQuizQuestionAction({
        id: editing?.id,
        quizId,
        prompt: draft.prompt,
        hint: draft.hint,
        explanation: draft.explanation,
        points: draft.points,
        difficulty: draft.difficulty,
        displayOrder: editing ? editing.displayOrder : ordered.length,
        options: payloadOptions.map((option, index) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          displayOrder: index,
        })),
      });

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error("Could not save this question", result.message);
        return;
      }

      toast.success(editing ? "Question updated" : "Question added");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = moveItem(ordered, index, index + direction);
    if (next === ordered) return;

    setBusy(true);
    try {
      const result = await reorderQuizQuestionsAction({
        quizId,
        orderedIds: next.map((question) => question.id),
      });
      if (!result.ok) {
        toast.error("Could not reorder the questions", result.message);
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
      const result = await deleteQuizQuestionAction(deleteTarget.id);
      if (!result.ok) {
        toast.error("Could not delete the question", result.message);
        return;
      }
      toast.success("Question deleted");
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
          <h2 className="font-heading text-base font-semibold">Questions</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            A hint is offered after a wrong answer, and an explanation is shown once the visitor gets
            it right. Both are optional but they are what make the quiz teach.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden="true" />
          Add question
        </Button>
      </div>

      <div className="mt-4">
        {ordered.length === 0 ? (
          <EmptyState
            icon={<HelpCircle className="size-5" aria-hidden="true" />}
            title="No questions yet"
            description="This quiz stays unpublished until it has at least one solvable question."
            action={
              <Button onClick={openCreate}>
                <Plus aria-hidden="true" />
                Add the first question
              </Button>
            }
          />
        ) : (
          <ol className="flex flex-col gap-3">
            {ordered.map((question, index) => (
              <li
                key={question.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground"
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium wrap-anywhere">{question.prompt}</p>

                  <ul className="mt-2 flex flex-col gap-1">
                    {question.options.map((option) => (
                      <li
                        key={`${question.id}-${option.id ?? option.text}`}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        {option.isCorrect ? (
                          <CheckCircle2
                            className="mt-0.5 size-4 shrink-0 text-success"
                            aria-hidden="true"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border"
                          />
                        )}
                        <span className={option.isCorrect ? "font-medium text-foreground" : undefined}>
                          {option.text}
                          {option.isCorrect ? (
                            <span className="sr-only"> (correct answer)</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="muted">{question.points} points</Badge>
                    <Badge variant="soft">{QUESTION_DIFFICULTY_LABELS[question.difficulty]}</Badge>
                    {question.hint ? <Badge variant="muted">Hint</Badge> : null}
                    {question.explanation ? <Badge variant="muted">Explanation</Badge> : null}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move question ${index + 1} up`}
                    disabled={index === 0 || busy}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move question ${index + 1} down`}
                    disabled={index === ordered.length - 1 || busy}
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit question ${index + 1}`}
                    onClick={() => openEdit(question)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete question ${index + 1}`}
                    onClick={() => setDeleteTarget(question)}
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
            <DialogTitle>{editing ? "Edit question" : "Add question"}</DialogTitle>
            <DialogDescription>
              Choose the correct answer with the radio button on the left of an option. Options are
              always shown to visitors in the order written here.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <FormField
              id="question-prompt"
              label="Question"
              required
              error={fieldErrors.prompt?.[0]}
            >
              <Textarea
                id="question-prompt"
                rows={2}
                maxLength={400}
                placeholder="Why do butterflies visit flowers?"
                value={draft.prompt}
                onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
              />
            </FormField>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium">
                Answer options <span className="text-destructive">*</span>
              </legend>

              {fieldErrors.options ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {fieldErrors.options[0]}
                </p>
              ) : null}

              <div className="flex flex-col gap-2">
                {draft.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-option"
                      className="size-4 shrink-0 accent-[var(--color-primary)]"
                      checked={option.isCorrect}
                      onChange={() => markCorrect(index)}
                      aria-label={`Mark option ${index + 1} as the correct answer`}
                    />
                    <Input
                      value={option.text}
                      maxLength={160}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      aria-label={`Option ${String.fromCharCode(65 + index)}`}
                      onChange={(event) => setOption(index, { text: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Remove option ${String.fromCharCode(65 + index)}`}
                      disabled={draft.options.length <= 2}
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draft.options.length >= MAX_OPTIONS}
                  onClick={addOption}
                >
                  <Plus aria-hidden="true" />
                  Add option
                </Button>
              </div>
            </fieldset>

            <FormField
              id="question-hint"
              label="Hint"
              error={fieldErrors.hint?.[0]}
              description="Shown after the first wrong answer. Point at the idea, never at the letter."
            >
              <Input
                id="question-hint"
                maxLength={400}
                placeholder="Think about what butterflies get from flowers."
                value={draft.hint}
                onChange={(event) => setDraft({ ...draft, hint: event.target.value })}
              />
            </FormField>

            <FormField
              id="question-explanation"
              label="Explanation"
              error={fieldErrors.explanation?.[0]}
              description="Shown once the visitor is correct, or when the answer is revealed."
            >
              <Textarea
                id="question-explanation"
                rows={3}
                maxLength={600}
                placeholder="Butterflies visit flowers for nectar, and while feeding they carry pollen between flowers."
                value={draft.explanation}
                onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="question-points"
                label="Full points"
                error={fieldErrors.points?.[0]}
                description="Awarded for a correct first try. Later attempts earn a share."
              >
                <Input
                  id="question-points"
                  type="number"
                  min={0}
                  max={500}
                  value={draft.points}
                  onChange={(event) =>
                    setDraft({ ...draft, points: Number(event.target.value) || 0 })
                  }
                />
              </FormField>

              <FormField id="question-difficulty" label="Difficulty">
                <Select
                  value={draft.difficulty}
                  onValueChange={(value) =>
                    setDraft({ ...draft, difficulty: value as QuestionDifficulty })
                  }
                >
                  <SelectTrigger id="question-difficulty" aria-label="Difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_DIFFICULTIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {QUESTION_DIFFICULTY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <Alert variant="info">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <AlertTitle>Scoring</AlertTitle>
                <AlertDescription>
                  First try: full points · after the hint: 75% · after a retry: 50% · answer
                  revealed: 25%. Wrong answers never remove points.
                </AlertDescription>
              </div>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy} loadingLabel="Saving…">
                {editing ? "Save question" : "Add question"}
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
        title="Delete this question?"
        description="The question and its options are removed from the quiz immediately. Answers already given by visitors stay in the analytics totals."
        confirmLabel="Delete question"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}

function emptyDraft(): DraftState {
  return {
    prompt: "",
    hint: "",
    explanation: "",
    points: 20,
    difficulty: "easy",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  };
}
