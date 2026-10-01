import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Award,
  FileText,
  HelpCircle,
  MapPin,
  QrCode,
  Route,
  ScanLine,
  Trophy,
} from "lucide-react";

import { AdminPageHeader, StatCard } from "@/components/admin/stat-card";
import {
  ChartCard,
  HorizontalBarChart,
  ScansOverTimeChart,
} from "@/components/charts/analytics-charts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getDashboardStats,
  getFrequentlyMissedQuestions,
  getPopularTrails,
  getQuizPerformance,
  getScansByLocation,
  getScansOverTime,
  getTopQrCodes,
} from "@/db/queries/analytics";
import { listAuditLogs } from "@/db/queries/audit";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { countBadges } from "@/db/queries/badges";
import { countMediaAssets } from "@/db/queries/media";
import { formatDateTime, formatNumber, percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const garden = await ensurePrimaryGarden();

  const [
    stats,
    scansOverTime,
    scansByLocation,
    popularTrails,
    quizPerformance,
    missedQuestions,
    topQrCodes,
    badgeCounts,
    mediaCount,
    audit,
  ] = await Promise.all([
    getDashboardStats(garden.id),
    getScansOverTime(garden.id, 30),
    getScansByLocation(garden.id),
    getPopularTrails(garden.id),
    getQuizPerformance(garden.id),
    getFrequentlyMissedQuestions(garden.id),
    getTopQrCodes(garden.id, 5),
    countBadges(),
    countMediaAssets(),
    listAuditLogs({ page: 1, pageSize: 6 }),
  ]);

  const hasActivity = stats.totalScans > 0 || stats.quizAttempts > 0;

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description={`Live figures for ${garden.name}, calculated from the production database — nothing on this page is estimated or mocked.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/locations/new">New location</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/qr">Manage QR codes</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/analytics">Full analytics</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total locations"
          value={stats.totalLocations}
          hint={`${stats.publishedLocations} published`}
          icon={MapPin}
          href="/admin/locations"
        />
        <StatCard
          label="Active QR codes"
          value={stats.activeQrCodes}
          hint={`${stats.totalQrCodes} total codes`}
          icon={QrCode}
          href="/admin/qr"
        />
        <StatCard
          label="Published trails"
          value={stats.publishedTrails}
          hint={`${stats.totalTrails} total trails`}
          icon={Route}
          href="/admin/trails"
        />
        <StatCard
          label="Total scans"
          value={stats.totalScans}
          hint={`${formatNumber(stats.scansLast7Days)} in the last 7 days`}
          icon={ScanLine}
          tone="primary"
        />
        <StatCard
          label="Quiz attempts"
          value={stats.quizAttempts}
          hint={`${formatNumber(stats.activityCompletions)} activities completed`}
          icon={HelpCircle}
          href="/admin/quizzes"
        />
        <StatCard
          label="Published content"
          value={stats.publishedContent}
          hint={`${stats.publishedQuizzes} quizzes live`}
          icon={FileText}
          href="/admin/content"
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Trails completed"
          value={stats.trailCompletionCount}
          hint="Recorded trail completions"
          icon={Trophy}
          tone="warm"
        />
        <StatCard
          label="Badges configured"
          value={badgeCounts.total}
          hint={`${badgeCounts.published} published`}
          icon={Award}
          href="/admin/badges"
        />
        <StatCard
          label="Media assets"
          value={mediaCount}
          hint="Images stored in Cloudinary"
          icon={BarChart3}
          href="/admin/media"
        />
        <StatCard
          label="Locations featured"
          value={stats.publishedLocations === 0 ? 0 : percent(stats.publishedLocations, stats.totalLocations)}
          hint="Percentage of places published"
          icon={MapPin}
          tone="primary"
        />
      </div>

      {!hasActivity ? (
        <Alert variant="info" className="mt-5">
          <BarChart3 aria-hidden="true" />
          <div>
            <AlertTitle>Analytics will appear after visitors explore the garden</AlertTitle>
            <AlertDescription>
              Scan counts, quiz results and trail completions are recorded anonymously. Nothing is
              simulated, so these panels stay empty until real visits happen.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Scans over time"
          description="Daily QR scans across the whole garden for the last 30 days."
        >
          <ScansOverTimeChart data={scansOverTime} />
        </ChartCard>

        <ChartCard
          title="Scans by location"
          description="Which learning points visitors actually reach."
        >
          <HorizontalBarChart data={scansByLocation} valueLabel="Scans" />
        </ChartCard>

        <ChartCard title="Popular trails" description="Scans recorded while following each trail.">
          <HorizontalBarChart data={popularTrails} valueLabel="Scans" />
        </ChartCard>

        <ChartCard
          title="Top QR codes"
          description="Printed signs with the most scans. Consider adding more signs near the quiet ones."
        >
          {topQrCodes.length === 0 ? (
            <EmptyState
              className="border-0 py-8"
              icon={<QrCode className="size-5" aria-hidden />}
              title="No scans recorded yet"
              description="Once a sign is scanned its counter appears here."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {topQrCodes.map((qr) => (
                <li key={qr.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-mono font-medium wrap-anywhere">{qr.label}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatNumber(qr.total)} scans
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Quiz performance by location"
          description="Accuracy counts every answer attempt, including retries."
        >
          {quizPerformance.length === 0 ? (
            <EmptyState
              className="border-0 py-8"
              icon={<HelpCircle className="size-5" aria-hidden />}
              title="No quiz answers yet"
              description="Quiz statistics appear once visitors answer questions."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th scope="col" className="py-2 pr-3">Place</th>
                    <th scope="col" className="py-2 pr-3">Attempts</th>
                    <th scope="col" className="py-2 pr-3">Accuracy</th>
                    <th scope="col" className="py-2 pr-3">First try</th>
                    <th scope="col" className="py-2">Revealed</th>
                  </tr>
                </thead>
                <tbody>
                  {quizPerformance.map((row) => (
                    <tr key={row.locationName} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-3">{row.locationName}</td>
                      <td className="py-2.5 pr-3">{formatNumber(row.attempts)}</td>
                      <td className="py-2.5 pr-3 font-medium">{row.accuracy}%</td>
                      <td className="py-2.5 pr-3">{formatNumber(row.firstTry)}</td>
                      <td className="py-2.5">{formatNumber(row.revealed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Frequently missed questions"
          description="Where visitors struggle most — a good signal that a learning card needs clarifying."
        >
          {missedQuestions.length === 0 ? (
            <EmptyState
              className="border-0 py-8"
              icon={<HelpCircle className="size-5" aria-hidden />}
              title="No wrong answers recorded yet"
              description="Once visitors answer questions this list highlights the hardest ones."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {missedQuestions.slice(0, 5).map((row) => (
                <li key={row.questionId} className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{row.prompt}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.locationName} · {formatNumber(row.wrong)} wrong of{" "}
                    {formatNumber(row.attempts)} attempts · {row.accuracy}% accurate ·{" "}
                    {formatNumber(row.usedHint)} used a hint
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <ChartCard
        className="mt-6"
        title="Recent admin activity"
        description="Every important change is recorded with the acting account and a timestamp."
      >
        {audit.rows.length === 0 ? (
          <EmptyState
            className="border-0 py-8"
            icon={<FileText className="size-5" aria-hidden />}
            title="No admin actions recorded yet"
            description="Publishing a location, creating a QR code or editing a trail will show up here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {audit.rows.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{entry.action.replaceAll("_", " ").toLowerCase()}</span>
                {entry.entityLabel ? (
                  <span className="text-muted-foreground">{entry.entityLabel}</span>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {entry.adminEmail ?? "system"} · {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings">Audit settings</Link>
          </Button>
        </div>
      </ChartCard>

      <Card className="mt-6 p-5">
        <h2 className="font-heading text-base font-semibold">Quick start</h2>
        <ol className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/admin/locations/new", label: "Create a garden place" },
            { href: "/admin/qr", label: "Generate and print a QR code" },
            { href: "/admin/trails/new", label: "Build a trail" },
            { href: "/admin/quizzes", label: "Write a quiz" },
            { href: "/admin/badges", label: "Add a badge" },
            { href: "/admin/settings", label: "Set branding and contact details" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
