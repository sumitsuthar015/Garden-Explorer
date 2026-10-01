"use client";

import * as React from "react";
import { ArrowRight, Check, Lightbulb, PartyPopper, X } from "lucide-react";

import type { PublicQuiz } from "@/db/queries/locations";
import { submitQuizAnswerAction } from "@/lib/actions/learning";
import {
  MULTIPLIER_BY_OUTCOME,
  wrongAnswerFeedback,
  type AnswerOutcome,
} from "@/lib/scoring";
import { Mascot, type MascotMood } from "@/components/kids/mascot";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { celebrate } from "@/lib/celebrate";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

/** Game-show colours for the answer letters, so each option is easy to point at. */
const LETTER_COLOURS = [
  "bg-rose-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-orange-500",
];

/**
 * The quiz experience.
 *
 * Every answer is graded on the server, so the browser never holds the answer
 * key. Wrong answers always teach: attempt 1 offers a hint, attempt 2 offers
 * "almost there" with another try, attempt 3 reveals the answer and the
 * explanation. The visitor can always continue and never loses XP.
 */

type QuestionPhase = "answering" | "incorrect" | "resolved";

interface QuestionState {
  phase: QuestionPhase;
  attemptNumber: number;
  usedHint: boolean;
  hintVisible: boolean;
  selectedOptionId: string | null;
  /** Option ids the visitor already tried and that were wrong. */
  triedOptionIds: string[];
  correctOptionId: string | null;
  explanation: string | null;
  outcome: AnswerOutcome | null;
  pointsAwarded: number;
  feedback: ReturnType<typeof wrongAnswerFeedback> | null;
}

interface QuizFlowProps {
  quiz: PublicQuiz;
  visitorId: string;
  trailId: string | null;
  onQuestionAnswered: (input: { outcome: AnswerOutcome; correct: boolean; points: number }) => void;
  onComplete: (pointsEarned: number) => void;
  onStarted?: () => void;
}

function initialState(): QuestionState {
  return {
    phase: "answering",
    attemptNumber: 0,
    usedHint: false,
    hintVisible: false,
    selectedOptionId: null,
    triedOptionIds: [],
    correctOptionId: null,
    explanation: null,
    outcome: null,
    pointsAwarded: 0,
    feedback: null,
  };
}

export function QuizFlow({
  quiz,
  visitorId,
  trailId,
  onQuestionAnswered,
  onComplete,
  onStarted,
}: QuizFlowProps) {
  const [index, setIndex] = React.useState(0);
  const [state, setState] = React.useState<QuestionState>(initialState);
  const [pending, setPending] = React.useState(false);
  const [earned, setEarned] = React.useState(0);
  const [shaking, setShaking] = React.useState(false);
  const startedRef = React.useRef(false);

  const question = quiz.questions[index];
  const total = quiz.questions.length;
  const isLast = index === total - 1;

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    onStarted?.();
  }, [onStarted]);

  async function submit() {
    if (!state.selectedOptionId || pending) return;
    setPending(true);

    const attemptNumber = state.attemptNumber + 1;

    try {
      const result = await submitQuizAnswerAction({
        questionId: question.id,
        optionId: state.selectedOptionId,
        attemptNumber,
        usedHint: state.usedHint,
        visitorId,
        trailId: trailId ?? undefined,
      });

      if (!result.ok) {
        toast.error("We could not check that answer", result.message);
        return;
      }

      const data = result.data;
      const points = data.pointsAwarded;

      if (data.correct || data.revealAnswer) {
        setEarned((value) => value + points);
        setState((previous) => ({
          ...previous,
          phase: "resolved",
          attemptNumber: data.attemptNumber,
          correctOptionId: data.correctOptionId,
          explanation: data.explanation,
          outcome: data.outcome,
          pointsAwarded: points,
          feedback: null,
        }));
        onQuestionAnswered({
          outcome: data.outcome,
          correct: data.correct,
          points,
        });
        if (data.correct) {
          playSound("correct");
          celebrate(data.outcome === "first_try" ? "big" : "small");
        } else {
          playSound("pop");
        }
        return;
      }

      playSound("tryAgain");
      setShaking(true);
      window.setTimeout(() => setShaking(false), 550);

      // Incorrect, but the visitor still has tries left.
      setState((previous) => ({
        ...previous,
        phase: "incorrect",
        attemptNumber: data.attemptNumber,
        triedOptionIds: previous.selectedOptionId
          ? [...previous.triedOptionIds, previous.selectedOptionId]
          : previous.triedOptionIds,
        selectedOptionId: null,
        usedHint: true,
        hintVisible: true,
        feedback: wrongAnswerFeedback(data.attemptNumber),
      }));
    } catch {
      toast.error("Something went wrong", "Please try that question again.");
    } finally {
      setPending(false);
    }
  }

  function advance() {
    if (isLast) {
      // `earned` already includes this question's points.
      onComplete(earned);
      return;
    }
    setIndex((value) => value + 1);
    setState(initialState());
  }

  const isResolved = state.phase === "resolved";
  const answeredCorrectly = isResolved && state.outcome !== "revealed";
  const progressValue = Math.round(((index + (isResolved ? 1 : 0)) / total) * 100);
  const mood: MascotMood = answeredCorrectly
    ? "cheer"
    : state.phase === "incorrect" || isResolved
      ? "think"
      : "happy";

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-3xl border-2 border-violet-200 shadow-lift",
        shaking && "animate-shake",
      )}
    >
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 px-5 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl ring-1 ring-white/30"
          >
            ❓
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-lg leading-tight font-bold">{quiz.title}</p>
            <p className="text-xs font-medium text-white/85">
              Question {index + 1} of {total}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            key={earned}
            className="animate-bounce-in rounded-full bg-white px-3 py-1 font-heading text-sm font-bold text-violet-700 tabular-nums shadow-sm"
          >
            ⭐ {earned} XP
          </span>
          <Mascot mood={mood} className="-my-5 w-14 sm:w-16" />
        </div>
      </div>

      {/* One dot per question; the progressbar below carries the same news for screen readers. */}
      <div aria-hidden="true" className="flex items-center gap-1.5 bg-violet-50 px-5 py-2.5">
        {quiz.questions.map((entry, entryIndex) => (
          <span
            key={entry.id}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors duration-500",
              entryIndex < index || (entryIndex === index && isResolved)
                ? "bg-violet-500"
                : entryIndex === index
                  ? "animate-pulse bg-violet-300"
                  : "bg-violet-200/60",
            )}
          />
        ))}
      </div>
      <Progress
        value={progressValue}
        className="sr-only"
        aria-label={`Quiz progress: question ${index + 1} of ${total}`}
      />

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <h3 key={question.id} className="animate-rise font-heading text-xl leading-snug font-bold text-balance sm:text-2xl">
          {question.prompt}
        </h3>

        <fieldset className="flex flex-col gap-3" disabled={isResolved || pending}>
          <legend className="sr-only">Choose one answer</legend>

          {question.options.map((option, optionIndex) => {
            const letter = String.fromCharCode(65 + optionIndex);
            const isSelected = state.selectedOptionId === option.id;
            const wasTried = state.triedOptionIds.includes(option.id);
            const isCorrect = isResolved && state.correctOptionId === option.id;

            return (
              <label
                key={option.id}
                style={{ animationDelay: `${80 + optionIndex * 70}ms` }}
                className={cn(
                  "group/option flex min-h-14 animate-rise cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-base font-medium transition-[transform,background-color,border-color,box-shadow,opacity] duration-200",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  isResolved
                    ? isCorrect
                      ? "scale-[1.02] border-emerald-400 bg-emerald-50 shadow-[0_10px_24px_-14px_rgb(16_185_129/0.9)]"
                      : "border-border bg-muted/40 opacity-60"
                    : wasTried
                      ? "border-rose-200 bg-rose-50"
                      : isSelected
                        ? "-translate-y-0.5 border-violet-500 bg-violet-50 shadow-[0_10px_24px_-14px_rgb(139_92_246/0.9)]"
                        : "border-border bg-card hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/60",
                )}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={isSelected}
                  onChange={() => {
                    playSound("pop");
                    setState((previous) => ({ ...previous, selectedOptionId: option.id }));
                  }}
                  className="size-5 shrink-0 accent-violet-600"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl font-heading text-sm font-bold text-white shadow-sm transition-transform duration-200 group-hover/option:scale-110",
                    LETTER_COLOURS[optionIndex % LETTER_COLOURS.length],
                  )}
                >
                  {letter}
                </span>
                <span className="flex-1">{option.text}</span>
                {/* Correctness is never colour-only: icons + words carry the meaning. */}
                {isResolved && isCorrect ? (
                  <span className="inline-flex animate-bounce-in items-center gap-1 text-sm font-bold text-emerald-700">
                    <Check className="size-5" aria-hidden="true" strokeWidth={3} />
                    Correct
                  </span>
                ) : null}
                {wasTried ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                    <X className="size-4" aria-hidden="true" />
                    Your earlier try
                  </span>
                ) : null}
              </label>
            );
          })}
        </fieldset>

        {/* Hint: requestable before answering, shown automatically after a miss. */}
        {!isResolved && (state.hintVisible || state.phase === "incorrect") ? (
          <Alert variant="warning">
            <Lightbulb aria-hidden="true" />
            <div>
              <AlertTitle>Hint</AlertTitle>
              <AlertDescription>
                {question.hint ?? "Think about what you saw and read in this place."}
              </AlertDescription>
            </div>
          </Alert>
        ) : null}

        {!isResolved && state.phase === "answering" && !state.hintVisible && question.hint ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setState((previous) => ({ ...previous, hintVisible: true, usedHint: true }))}
          >
            <Lightbulb aria-hidden="true" />
            Show me a hint
            <span className="text-xs text-muted-foreground">
              ({Math.round(MULTIPLIER_BY_OUTCOME.after_hint * 100)}% of the points)
            </span>
          </Button>
        ) : null}

        {state.phase === "incorrect" && state.feedback ? (
          <Alert variant="warning">
            <Lightbulb aria-hidden="true" />
            <div>
              <AlertTitle>{state.feedback.title}</AlertTitle>
              <AlertDescription>{state.feedback.body}</AlertDescription>
            </div>
          </Alert>
        ) : null}

        {state.phase === "answering" ? (
          <Button size="lg" onClick={submit} loading={pending} loadingLabel="Checking…" disabled={!state.selectedOptionId}>
            Check my answer
          </Button>
        ) : null}

        {state.phase === "incorrect" && state.feedback ? (
          <Button size="lg" onClick={submit} loading={pending} loadingLabel="Checking…" disabled={!state.selectedOptionId}>
            {state.feedback.action}
          </Button>
        ) : null}

        {isResolved ? (
          <div className="relative flex flex-col gap-4">
            {state.pointsAwarded > 0 ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-3 right-4 animate-float-up font-heading text-2xl font-bold text-amber-500"
              >
                +{state.pointsAwarded} XP
              </span>
            ) : null}
            <Alert variant={answeredCorrectly ? "success" : "info"}>
              {answeredCorrectly ? <PartyPopper aria-hidden="true" /> : <Lightbulb aria-hidden="true" />}
              <div>
                <AlertTitle>
                  {answeredCorrectly
                    ? state.outcome === "first_try"
                      ? "That's right — first try!"
                      : "That's right."
                    : "Here is the answer so you can keep going."}
                </AlertTitle>
                <AlertDescription>
                  <span className="block">
                    You earned <span className="font-semibold">{state.pointsAwarded} XP</span> for
                    this question.
                  </span>
                  {state.outcome === "first_try"
                    ? " Full points for answering without help."
                    : state.outcome === "after_hint"
                      ? " Points for getting there with the hint."
                      : state.outcome === "after_retry"
                        ? " Points for sticking with it."
                        : " Participation points — wrong answers never cost you anything."}
                </AlertDescription>
              </div>
            </Alert>

            {state.explanation ? (
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-heading text-sm font-semibold">Why</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {state.explanation}
                </p>
              </div>
            ) : null}

            <Button size="lg" onClick={advance}>
              {isLast ? "Finish quiz" : "Next question"}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
