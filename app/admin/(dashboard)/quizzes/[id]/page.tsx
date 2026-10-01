import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ChevronLeft, ExternalLink } from "lucide-react";

import { QuizQuestionEditor } from "@/components/admin/quiz-question-editor";
import { QuizSettingsForm } from "@/components/admin/quiz-settings-form";
import { QuizStatusControls } from "@/components/admin/quiz-status-controls";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQuizForAdmin } from "@/db/queries/quizzes";
import { listLocationOptions } from "@/db/queries/locations";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { validateQuizForPublishing } from "@/lib/validation/quiz";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getQuizForAdmin(id);
  return {
    title: detail ? detail.quiz.title : "Quiz",
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminQuizDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getQuizForAdmin(id);
  if (!detail) notFound();

  const garden = await ensurePrimaryGarden();
  const locations = await listLocationOptions(garden.id);

  // The same checks the publish action runs, shown before the click.
  const problems = validateQuizForPublishing(
    detail.quiz,
    detail.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
  );

  return (
    <>
      <AdminPageHeader
        title={detail.quiz.title}
        description={`${detail.questions.length} question${detail.questions.length === 1 ? "" : "s"} · ${detail.locationName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/quizzes">
                <ChevronLeft aria-hidden="true" />
                All quizzes
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/locations/${detail.locationSlug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden="true" />
                View place on site
              </Link>
            </Button>
            <QuizStatusControls
              id={detail.quiz.id}
              title={detail.quiz.title}
              status={detail.quiz.status}
            />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={detail.quiz.status} />
        <span className="text-sm text-muted-foreground">
          Shown at{" "}
          <Link
            href={`/admin/locations/${detail.quiz.locationId}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {detail.locationName}
          </Link>
        </span>
        {detail.locationStatus !== "published" ? (
          <span className="text-sm text-warning">
            The place itself is {detail.locationStatus}, so visitors cannot reach this quiz yet.
          </span>
        ) : null}
      </div>

      {detail.quiz.status === "published" && problems.length > 0 ? (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle aria-hidden="true" />
          <div>
            <AlertTitle>This published quiz has a problem</AlertTitle>
            <AlertDescription>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
              Fix it and re-publish, or unpublish the quiz so visitors are not shown a broken
              question.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {detail.quiz.status !== "published" && problems.length > 0 ? (
        <Alert variant="warning" className="mb-5">
          <AlertCircle aria-hidden="true" />
          <div>
            <AlertTitle>Not ready to publish</AlertTitle>
            <AlertDescription>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions ({detail.questions.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-5">
          <QuizQuestionEditor
            quizId={detail.quiz.id}
            questions={detail.questions.map((question) => ({
              id: question.id,
              prompt: question.prompt,
              hint: question.hint ?? "",
              explanation: question.explanation ?? "",
              points: question.points,
              difficulty: question.difficulty,
              displayOrder: question.displayOrder,
              options: question.options.map((option) => ({
                id: option.id,
                text: option.text,
                isCorrect: option.isCorrect,
              })),
            }))}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <QuizSettingsForm
              defaultValues={{
                id: detail.quiz.id,
                locationId: detail.quiz.locationId,
                title: detail.quiz.title,
                description: detail.quiz.description ?? "",
                completionPoints: detail.quiz.completionPoints,
                displayOrder: detail.quiz.displayOrder,
                status: detail.quiz.status,
              }}
            />

            <Card className="h-fit p-5">
              <h2 className="font-heading text-sm font-semibold">Where this quiz is used</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                The quiz runs as the last step of the learning experience at{" "}
                <strong className="font-medium text-foreground">{detail.locationName}</strong>. It
                also appears wherever that place is used in a trail.
              </p>
              <dl className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Questions</dt>
                  <dd className="font-medium">{detail.questions.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Question points</dt>
                  <dd className="font-medium">
                    {detail.questions.reduce((sum, question) => sum + question.points, 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Completion points</dt>
                  <dd className="font-medium">{detail.quiz.completionPoints}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Available places</dt>
                  <dd className="font-medium">{locations.length}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Visitor answers are graded on the server against the stored correct option. Points
                are never taken from the browser, and a wrong answer never subtracts XP.
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
