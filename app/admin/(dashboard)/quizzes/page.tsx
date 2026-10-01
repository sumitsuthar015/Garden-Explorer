import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle } from "lucide-react";

import { QuizCreateButton } from "@/components/admin/quiz-create-button";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { AdminFilterBar, StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { listLocationOptions } from "@/db/queries/locations";
import { listQuizzesAdmin } from "@/db/queries/quizzes";
import {
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABELS,
  QUESTION_DIFFICULTIES,
  QUESTION_DIFFICULTY_LABELS,
  type PublishStatus,
  type QuestionDifficulty,
} from "@/lib/constants";
import { paginationSchema } from "@/lib/validation/common";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quizzes",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminQuizzesPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") flat[key] = value[0];
  }

  const pagination = paginationSchema.parse(flat);
  const status = (PUBLISH_STATUSES as readonly string[]).includes(flat.status ?? "")
    ? (flat.status as PublishStatus)
    : "all";
  const difficulty = (QUESTION_DIFFICULTIES as readonly string[]).includes(flat.difficulty ?? "")
    ? (flat.difficulty as QuestionDifficulty)
    : "all";
  const locationId = flat.locationId ?? "";

  const garden = await ensurePrimaryGarden();
  const [locations, result] = await Promise.all([
    listLocationOptions(garden.id),
    listQuizzesAdmin(garden.id, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: pagination.search,
      status,
      locationId,
      difficulty,
      sort: pagination.sort || "updated",
      direction: pagination.direction,
    }),
  ]);

  // Plain data, not a callback: `Pagination` is a client component.
  const paginationParams: Record<string, string> = {};
  if (pagination.search) paginationParams.search = pagination.search;
  if (status !== "all") paginationParams.status = status;
  if (difficulty !== "all") paginationParams.difficulty = difficulty;
  if (locationId) paginationParams.locationId = locationId;

  return (
    <>
      <AdminPageHeader
        title="Quizzes"
        description="Short check-ins at the end of a learning point. Every question teaches: a wrong answer shows a hint, offers another try, and still awards points."
        actions={
          <QuizCreateButton
            locations={locations.map((location) => ({ id: location.id, name: location.name }))}
            defaultLocationId={locationId || undefined}
          />
        }
      />

      <AdminFilterBar
        action="/admin/quizzes"
        searchValue={pagination.search}
        searchPlaceholder="Search quizzes by title…"
        filters={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              { value: "all", label: "All statuses" },
              ...PUBLISH_STATUSES.map((value) => ({
                value,
                label: PUBLISH_STATUS_LABELS[value],
              })),
            ],
          },
          {
            name: "locationId",
            label: "Place",
            value: locationId,
            options: [
              { value: "", label: "All places" },
              ...locations.map((location) => ({ value: location.id, label: location.name })),
            ],
          },
          {
            name: "difficulty",
            label: "Question difficulty",
            value: difficulty,
            options: [
              { value: "all", label: "Any difficulty" },
              ...QUESTION_DIFFICULTIES.map((value) => ({
                value,
                label: QUESTION_DIFFICULTY_LABELS[value],
              })),
            ],
          },
        ]}
        sortOptions={[
          { value: "updated", label: "Recently updated" },
          { value: "title", label: "Title" },
          { value: "status", label: "Status" },
        ]}
        sortValue={pagination.sort || "updated"}
      />

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="size-5" aria-hidden="true" />}
          title={
            pagination.search || status !== "all" || locationId || difficulty !== "all"
              ? "No quizzes match these filters"
              : "No quizzes yet"
          }
          description={
            locations.length === 0
              ? "Create a garden place first — a quiz belongs to one place."
              : "Create a quiz for a garden place, then add questions with a hint and an explanation for each one."
          }
          action={
            locations.length === 0 ? (
              <Button asChild>
                <Link href="/admin/locations/new">Create a location</Link>
              </Button>
            ) : (
              <QuizCreateButton
                locations={locations.map((location) => ({ id: location.id, name: location.name }))}
                label="Create quiz"
              />
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz</TableHead>
                <TableHead>Place</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell>
                    <Link
                      href={`/admin/quizzes/${quiz.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {quiz.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Link
                      href={`/admin/locations/${quiz.locationId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {quiz.locationName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-sm">{quiz.questionCount}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {quiz.totalPoints}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={quiz.status} />
                      {quiz.status === "published" && quiz.questionCount === 0 ? (
                        <Badge variant="destructive">No questions</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(quiz.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={result.total}
        basePath="/admin/quizzes"
        params={paginationParams}
        className="mt-4"
      />
    </>
  );
}
