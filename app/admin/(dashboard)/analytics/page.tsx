import type { Metadata } from "next";
import { BarChart3, HelpCircle, Info, QrCode, Sparkles, Target } from "lucide-react";

import { AdminPageHeader, StatCard } from "@/components/admin/stat-card";
import { AdminFilterBar } from "@/components/admin/status-badge";
import {
  ChartCard,
  HorizontalBarChart,
  ScansOverTimeChart,
} from "@/components/charts/analytics-charts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getEventBreakdown,
  getFrequentlyMissedQuestions,
  getPopularTrails,
  getQuizPerformance,
  getScansByLocation,
  getScansOverTime,
} from "@/db/queries/analytics";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { listLocationOptions } from "@/db/queries/locations";
import { listTrailOptions } from "@/db/queries/trails";
import { rangeToDays, analyticsFilterSchema } from "@/lib/validation/analytics";
import { formatNumber, percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

const EVENT_LABELS: Record<string, string> = {
  QR_SCANNED: "QR scans",
  LOCATION_VIEWED: "Places opened",
  ACTIVITY_STARTED: "Activities started",
  ACTIVITY_COMPLETED: "Activities completed",
  QUIZ_STARTED: "Quizzes started",
  QUESTION_ANSWERED: "Questions answered",
  QUIZ_COMPLETED: "Quizzes completed",
  TRAIL_STARTED: "Trails started",
  TRAIL_COMPLETED: "Trails completed",
  BADGE_EARNED: "Badges earned",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") flat[key] = value[0];
  }

  const filters = analyticsFilterSchema.parse(flat);
  const days = rangeToDays(filters.range);
  const locationId = filters.locationId || undefined;
  const trailId = filters.trailId || undefined;

  const garden = await ensurePrimaryGarden();
  const [scansOverTime, scansByLocation, popularTrails, quizPerformance, missedQuestions] =
    await Promise.all([
      getScansOverTime(garden.id, days ?? 365),
      getScansByLocation(garden.id, days, locationId),
      getPopularTrails(garden.id, days),
      getQuizPerformance(garden.id, days, locationId),
      getFrequentlyMissedQuestions(garden.id, days, locationId),
    ]);

  const [events, locations, trails] = await Promise.all([
    getEventBreakdown(garden.id, days, locationId),
    listLocationOptions(garden.id),
    listTrailOptions(garden.id),
  ]);

  // The trail filter narrows the trail chart without a second query shape.
  const trailChart = trailId
    ? popularTrails.filter((trail) => trail.id === trailId)
    : popularTrails;

  const totals = {
    scans: scansByLocation.reduce((sum, row) => sum + row.total, 0),
    attempts: quizPerformance.reduce((sum, row) => sum + row.attempts, 0),
    correct: quizPerformance.reduce((sum, row) => sum + row.correct, 0),
    firstTry: quizPerformance.reduce((sum, row) => sum + row.firstTry, 0),
    revealed: quizPerformance.reduce((sum, row) => sum + row.revealed, 0),
  };

  const hasAnyData =
    scansOverTime.length > 0 ||
    scansByLocation.length > 0 ||
    quizPerformance.length > 0 ||
    events.length > 0;

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="Anonymous, aggregate numbers only. No visitor accounts, no personal data and no IP addresses are stored — so this is what the garden can honestly measure."
      />

      <AdminFilterBar
        action="/admin/analytics"
        searchName="range"
        searchPlaceholder="Ignored — use the filters"
        filters={[
          {
            name: "range",
            label: "Period",
            value: filters.range,
            options: [
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
              { value: "all", label: "All time" },
            ],
          },
          {
            name: "locationId",
            label: "Place",
            value: filters.locationId,
            options: [
              { value: "", label: "All places" },
              ...locations.map((location) => ({ value: location.id, label: location.name })),
            ],
          },
          {
            name: "trailId",
            label: "Trail",
            value: filters.trailId,
            options: [
              { value: "", label: "All trails" },
              ...trails.map((trail) => ({ value: trail.id, label: trail.name })),
            ],
          },
        ]}
      />

      {!hasAnyData ? (
        <EmptyState
          icon={<BarChart3 className="size-5" aria-hidden="true" />}
          title="Not enough activity yet"
          description="Analytics will appear after visitors begin scanning garden signs. Nothing is estimated or filled in with example numbers."
          className="mt-2"
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={QrCode}
              tone="primary"
              label="Scans in period"
              value={formatNumber(totals.scans)}
              hint={days ? `Last ${days} days` : "All time"}
            />
            <StatCard
              icon={HelpCircle}
              label="Quiz answers"
              value={formatNumber(totals.attempts)}
              hint="Every attempt, including retries"
            />
            <StatCard
              icon={Target}
              label="Accuracy"
              value={`${percent(totals.correct, totals.attempts)}%`}
              hint={`${formatNumber(totals.correct)} correct`}
            />
            <StatCard
              icon={Sparkles}
              tone="warm"
              label="First-try answers"
              value={`${percent(totals.firstTry, totals.attempts)}%`}
              hint={`${formatNumber(totals.revealed)} answers revealed`}
            />
          </div>

          <ChartCard
            title="Scans over time"
            description="How many garden signs were scanned each day."
          >
            <ScansOverTimeChart data={scansOverTime} />
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard
              title="Scans by place"
              description="Which learning points visitors actually reach."
            >
              <HorizontalBarChart data={scansByLocation} valueLabel="scans" />
            </ChartCard>

            <ChartCard
              title="Trail activity"
              description="Scans recorded while a visitor was following a trail."
            >
              <HorizontalBarChart data={trailChart} valueLabel="scans" />
            </ChartCard>
          </div>

          <ChartCard
            title="Quiz performance by place"
            description="Where visitors need the most support — this is the content improvement list."
          >
            {quizPerformance.length === 0 ? (
              <EmptyState
                className="border-0 py-8"
                icon={<BarChart3 className="size-5" aria-hidden="true" />}
                title="No quiz answers in this period"
                description="Once visitors start answering, accuracy, hint use and reveal counts appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Place</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                      <TableHead className="text-right">Correct</TableHead>
                      <TableHead className="text-right">Accuracy</TableHead>
                      <TableHead className="text-right">First try</TableHead>
                      <TableHead className="text-right">Used hint</TableHead>
                      <TableHead className="text-right">Revealed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizPerformance.map((row) => (
                      <TableRow key={row.locationName}>
                        <TableCell className="font-medium">{row.locationName}</TableCell>
                        <TableCell className="text-right text-sm">{row.attempts}</TableCell>
                        <TableCell className="text-right text-sm">{row.correct}</TableCell>
                        <TableCell className="text-right text-sm">
                          {row.accuracy}%
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {row.firstTry}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {row.hintUsage}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {row.revealed}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ChartCard>

          <Card className="p-5">
            <h2 className="font-heading text-base font-semibold">Frequently missed questions</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Questions visitors get wrong most often. A high wrong count usually means the hint
              needs to be clearer, not that the question is too hard.
            </p>

            <div className="mt-4">
              {missedQuestions.length === 0 ? (
                <EmptyState
                  className="border-0 py-8"
                  icon={<BarChart3 className="size-5" aria-hidden="true" />}
                  title="Nothing stands out"
                  description="No question has been answered incorrectly in this period."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {missedQuestions.map((question) => (
                    <li
                      key={question.questionId}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <p className="font-medium wrap-anywhere">{question.prompt}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {question.locationName}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="destructive">{question.wrong} wrong</Badge>
                        <Badge variant="success">{question.correct} correct</Badge>
                        <Badge variant="muted">{question.usedHint} used the hint</Badge>
                        <Badge variant="warning">{question.revealed} had it revealed</Badge>
                        <Badge variant="soft">{question.accuracy}% accuracy</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <ChartCard
            title="Event breakdown"
            description="Every tracked event is anonymous and tied only to a place or a trail."
          >
            {events.length === 0 ? (
              <EmptyState
                className="border-0 py-8"
                icon={<BarChart3 className="size-5" aria-hidden="true" />}
                title="No events in this period"
                description="Events are recorded as visitors scan, read, do activities and finish quizzes."
              />
            ) : (
              <HorizontalBarChart
                data={events.map((event) => ({
                  id: event.name,
                  label: EVENT_LABELS[event.name] ?? event.name,
                  total: event.total,
                }))}
                valueLabel="events"
              />
            )}
          </ChartCard>

          <Alert variant="info">
            <Info aria-hidden="true" />
            <div>
              <AlertTitle>What is collected</AlertTitle>
              <AlertDescription>
                Scans, page views, activity completions and quiz answers, each linked to a garden
                place — plus a random identifier stored in the visitor&apos;s own browser so repeat
                visits are not double-counted as people. No names, emails, accounts, GPS positions or
                IP addresses are stored.
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}
    </>
  );
}
