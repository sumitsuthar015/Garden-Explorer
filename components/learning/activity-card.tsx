"use client";

import * as React from "react";
import { Check, Lightbulb, Loader2, Sparkles, ThumbsUp } from "lucide-react";

import type { PublicActivity } from "@/db/queries/locations";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { submitActivityAction } from "@/lib/actions/learning";
import { Mascot } from "@/components/kids/mascot";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { celebrate } from "@/lib/celebrate";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const TYPE_EMOJI: Record<PublicActivity["type"], string> = {
  observation: "👀",
  yes_no: "👍",
  multiple_choice: "🎯",
  selection: "☑️",
  thinking: "💭",
};

/**
 * Observation / science activity.
 *
 * Grading happens in a server action, so the answer key for yes/no and choice
 * activities never reaches the browser. Observation and thinking activities are
 * never "wrong" — they simply complete and award their points.
 */

interface ActivityCardProps {
  activity: PublicActivity;
  /** Called once when the activity is completed so XP can be banked locally. */
  onCompleted: (points: number) => void;
  visitorId: string;
  trailId: string | null;
  onContinue?: () => void;
  continueLabel?: string;
}

type Phase = "answering" | "correct" | "incorrect";

export function ActivityCard({
  activity,
  onCompleted,
  visitorId,
  trailId,
  onContinue,
  continueLabel = "Continue",
}: ActivityCardProps) {
  const [phase, setPhase] = React.useState<Phase>("answering");
  const [pending, setPending] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ message: string; hint: string | null } | null>(null);
  const [awardedPoints, setAwardedPoints] = React.useState(0);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [yesNo, setYesNo] = React.useState<boolean | null>(null);
  const [freeText, setFreeText] = React.useState("");
  const [correctIndexes, setCorrectIndexes] = React.useState<number[] | null>(null);
  const [sampleAnswer, setSampleAnswer] = React.useState<string | null>(null);
  const [shaking, setShaking] = React.useState(false);

  const options = activity.config.options ?? [];
  const confirmLabel = activity.config.confirmLabel ?? "I found one";
  const isFreeActivity = activity.type === "observation" || activity.type === "thinking";

  async function submit() {
    if (pending) return;

    if (activity.type === "yes_no" && yesNo === null) {
      toast.warning("Choose Yes or No first");
      return;
    }
    if (
      (activity.type === "multiple_choice" || activity.type === "selection") &&
      selected.length === 0
    ) {
      toast.warning("Pick an answer first");
      return;
    }
    if (activity.type === "thinking" && freeText.trim().length < 3) {
      toast.warning("Write a short thought first");
      return;
    }

    setPending(true);
    try {
      const result = await submitActivityAction({
        activityId: activity.id,
        selectedIndexes: selected,
        yesNo: yesNo ?? undefined,
        response: freeText.trim() || undefined,
        visitorId,
        trailId: trailId ?? undefined,
      });

      if (!result.ok) {
        toast.error("Could not check that activity", result.message);
        return;
      }

      const data = result.data;
      setFeedback({ message: data.message, hint: data.hint });
      setCorrectIndexes(data.correctIndexes);
      setSampleAnswer(data.sampleAnswer);
      setAwardedPoints(data.pointsAwarded);
      setPhase(data.correct ? "correct" : "incorrect");

      if (data.correct) {
        playSound("correct");
        celebrate("small");
      } else {
        playSound("tryAgain");
        setShaking(true);
        window.setTimeout(() => setShaking(false), 550);
      }

      if (data.completed) {
        onCompleted(data.pointsAwarded);
      }
    } catch {
      toast.error("Something went wrong", "Please try that activity again in a moment.");
    } finally {
      setPending(false);
    }
  }

  const completedPhase = phase === "correct";

  return (
    <Card
      className={cn(
        "animate-rise overflow-hidden rounded-3xl border-2 border-emerald-200 shadow-lift",
        shaking && "animate-shake",
      )}
    >
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 px-5 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl ring-1 ring-white/30"
          >
            {TYPE_EMOJI[activity.type]}
          </span>
          <div className="min-w-0">
            <p className="font-heading text-lg leading-tight font-bold">
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </p>
            <p className="text-xs font-medium text-white/85">⭐ {activity.points} points</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {completedPhase ? (
            <span className="inline-flex animate-bounce-in items-center gap-1 rounded-full bg-white px-2 py-1 text-sm font-bold text-emerald-700 sm:px-3">
              <Check className="size-4" aria-hidden="true" strokeWidth={3} />
              <span className="sr-only sm:not-sr-only">Complete</span>
            </span>
          ) : null}
          <Mascot
            mood={completedPhase ? "cheer" : phase === "incorrect" ? "think" : "happy"}
            className="-my-5 w-14 sm:w-16"
          />
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <p className="font-heading text-xl leading-snug font-bold text-balance">{activity.prompt}</p>

        {activity.type === "yes_no" && phase === "answering" ? (
          <div role="group" aria-label="Choose yes or no" className="grid grid-cols-2 gap-3">
            {YES_NO_CHOICES.map((choice) => (
              <button
                key={choice.label}
                type="button"
                aria-pressed={yesNo === choice.value}
                onClick={() => {
                  playSound("pop");
                  setYesNo(choice.value);
                }}
                className={cn(
                  "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 font-heading text-xl font-bold transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-1 active:scale-95",
                  yesNo === choice.value
                    ? cn("-translate-y-1", choice.selected)
                    : "border-border bg-card hover:border-emerald-300",
                )}
              >
                <span aria-hidden="true" className="text-3xl">
                  {choice.emoji}
                </span>
                {choice.label}
              </button>
            ))}
          </div>
        ) : null}

        {(activity.type === "multiple_choice" || activity.type === "selection") && (
          <fieldset className="flex flex-col gap-3" disabled={phase !== "answering"}>
            <legend className="sr-only">
              {activity.type === "selection" ? "Select all that apply" : "Choose one answer"}
            </legend>
            {activity.type === "selection" ? (
              <p className="text-sm font-medium text-muted-foreground">
                ☑️ Pick everything that fits.
              </p>
            ) : null}
            {options.map((option, index) => {
              const isSelected = selected.includes(index);
              const isCorrectOption = correctIndexes?.includes(index) ?? false;
              const showAsCorrect = phase !== "answering" && isCorrectOption;

              return (
                <label
                  key={`${activity.id}-${index}`}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-base font-medium transition-[transform,background-color,border-color] duration-200",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    phase === "answering"
                      ? isSelected
                        ? "-translate-y-0.5 border-emerald-500 bg-emerald-50"
                        : "border-border bg-card hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/50"
                      : showAsCorrect
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-border bg-muted/40 opacity-70",
                  )}
                >
                  <input
                    type={activity.type === "selection" ? "checkbox" : "radio"}
                    name={`activity-${activity.id}`}
                    value={index}
                    checked={isSelected}
                    onChange={() => {
                      playSound("pop");
                      setSelected((previous) =>
                        activity.type === "selection"
                          ? previous.includes(index)
                            ? previous.filter((value) => value !== index)
                            : [...previous, index]
                          : [index],
                      );
                    }}
                    className="size-5 shrink-0 accent-emerald-600"
                  />
                  <span className="flex-1">{option}</span>
                  {showAsCorrect ? (
                    <Check
                      className="size-5 shrink-0 text-emerald-600"
                      strokeWidth={3}
                      aria-label="Correct option"
                    />
                  ) : null}
                </label>
              );
            })}
          </fieldset>
        )}

        {activity.type === "thinking" && phase === "answering" ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`activity-text-${activity.id}`} className="sr-only">
              Your answer
            </label>
            <Textarea
              id={`activity-text-${activity.id}`}
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              placeholder="Write a sentence about what you noticed…"
              maxLength={400}
              className="min-h-28 rounded-2xl border-2 text-base"
            />
            <p className="text-sm text-muted-foreground">
              🧪 There is no wrong answer here — you are the scientist.
            </p>
          </div>
        ) : null}

        {isFreeActivity && phase === "answering" ? (
          <Button
            size="xl"
            onClick={submit}
            loading={pending}
            loadingLabel="Checking…"
            className="rounded-2xl"
          >
            <Sparkles aria-hidden="true" />
            {activity.type === "thinking" ? "Save my thought" : confirmLabel}
          </Button>
        ) : null}

        {!isFreeActivity && phase === "answering" ? (
          <Button
            size="xl"
            onClick={submit}
            loading={pending}
            loadingLabel="Checking…"
            className="rounded-2xl"
          >
            Check my answer
          </Button>
        ) : null}

        {phase !== "answering" && feedback ? (
          <div className="relative">
            {phase === "correct" && awardedPoints > 0 ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-4 right-4 animate-float-up font-heading text-2xl font-bold text-amber-500"
              >
                +{awardedPoints} XP
              </span>
            ) : null}
            <Alert
              variant={phase === "correct" ? "success" : "warning"}
              className="animate-bounce-in rounded-2xl"
            >
              {phase === "correct" ? <ThumbsUp aria-hidden="true" /> : <Lightbulb aria-hidden="true" />}
              <div>
                <AlertTitle>
                  {phase === "correct" ? feedback.message : "Not quite — but that is a good guess."}
                </AlertTitle>
                <AlertDescription>
                  {phase === "correct" ? (
                    <>
                      You earned <span className="font-semibold">{awardedPoints} XP</span>.
                      {sampleAnswer ? ` A gardener might say: “${sampleAnswer}”` : ""}
                    </>
                  ) : (
                    <>
                      {feedback.hint
                        ? `Hint: ${feedback.hint}`
                        : "Have another look around you and try again."}
                      {" You can retry as many times as you like."}
                    </>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          </div>
        ) : null}

        {phase === "incorrect" ? (
          <Button
            variant="outline"
            size="xl"
            className="rounded-2xl"
            onClick={() => {
              setPhase("answering");
              setFeedback(null);
              setCorrectIndexes(null);
            }}
          >
            <span aria-hidden="true">🔄</span>
            Try Again
          </Button>
        ) : null}

        {phase === "correct" && onContinue ? (
          <Button size="xl" onClick={onContinue} className="rounded-2xl">
            {continueLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

const YES_NO_CHOICES = [
  {
    value: true,
    label: "Yes",
    emoji: "👍",
    selected: "border-emerald-500 bg-emerald-50 shadow-[0_10px_24px_-14px_rgb(16_185_129/0.9)]",
  },
  {
    value: false,
    label: "No",
    emoji: "👎",
    selected: "border-rose-400 bg-rose-50 shadow-[0_10px_24px_-14px_rgb(244_63_94/0.8)]",
  },
] as const;

/** Small inline busy state used when a step is loading server data. */
export function ActivityLoading() {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      Loading activity…
    </div>
  );
}
