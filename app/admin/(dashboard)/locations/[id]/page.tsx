import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, HelpCircle, Route } from "lucide-react";

import { ActivityEditor } from "@/components/admin/activity-editor";
import { ContentBlockEditor } from "@/components/admin/content-block-editor";
import { FactEditor } from "@/components/admin/fact-editor";
import { LocationForm } from "@/components/admin/location-form";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLocationDetailForAdmin } from "@/db/queries/locations";
import { listQrCodesAdmin } from "@/db/queries/qr";
import { listTrailsAdmin } from "@/db/queries/trails";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit location",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLocationPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getLocationDetailForAdmin(id);
  if (!detail) notFound();

  const [qrCodes, trails] = await Promise.all([
    listQrCodesAdmin(detail.location.gardenId, {
      page: 1,
      pageSize: 20,
      search: "",
      status: "all",
      locationId: id,
      sort: "code",
      direction: "asc",
    }),
    listTrailsAdmin(detail.location.gardenId, {
      page: 1,
      pageSize: 50,
      search: "",
      status: "all",
      sort: "name",
      direction: "asc",
    }),
  ]);

  const trailsContaining = trails.rows.filter((trail) => detail.trailIds.includes(trail.id));

  return (
    <>
      <AdminPageHeader
        title={detail.location.name}
        description={`${detail.contentBlocks.length} learning cards · ${detail.activities.length} activities · ${detail.facts.length} facts · ${qrCodes.rows.length} QR sign${qrCodes.rows.length === 1 ? "" : "s"}`}
        actions={
          <>
            <StatusBadge status={detail.location.status} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/locations/${detail.location.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                Preview
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/locations">
                <ArrowLeft aria-hidden="true" />
                All locations
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="details">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="content">
            Cards ({detail.contentBlocks.length})
          </TabsTrigger>
          <TabsTrigger value="activities">
            Activities ({detail.activities.length})
          </TabsTrigger>
          <TabsTrigger value="facts">Facts ({detail.facts.length})</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <LocationForm
            mode="edit"
            defaultValues={{
              id: detail.location.id,
              name: detail.location.name,
              slug: detail.location.slug,
              shortDescription: detail.location.shortDescription,
              description: detail.location.description,
              category: detail.location.category,
              heroImageUrl: detail.location.heroImageUrl ?? "",
              heroImagePublicId: detail.location.heroImagePublicId ?? "",
              heroImageAlt: detail.location.heroImageAlt ?? "",
              icon: detail.location.icon ?? "",
              estimatedMinutes: detail.location.estimatedMinutes,
              status: detail.location.status,
              featured: detail.location.featured,
              displayOrder: detail.location.displayOrder,
            }}
          />
        </TabsContent>

        <TabsContent value="content">
          <ContentBlockEditor locationId={detail.location.id} blocks={detail.contentBlocks} />
        </TabsContent>

        <TabsContent value="activities">
          <ActivityEditor locationId={detail.location.id} activities={detail.activities} />
        </TabsContent>

        <TabsContent value="facts">
          <FactEditor locationId={detail.location.id} facts={detail.facts} />
        </TabsContent>

        <TabsContent value="links">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="font-heading text-base font-semibold">Quizzes at this place</h2>
              {detail.quizzes.length === 0 ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  No quiz yet. A short quiz is usually the last step of a learning point.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {detail.quizzes.map((quiz) => (
                    <li key={quiz.id}>
                      <Link
                        href={`/admin/quizzes/${quiz.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                      >
                        <span className="font-medium">{quiz.title}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="muted">{quiz.questionCount} questions</Badge>
                          <StatusBadge status={quiz.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/quizzes?locationId=${detail.location.id}`}>
                    <HelpCircle aria-hidden="true" />
                    Manage quizzes
                  </Link>
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-heading text-base font-semibold">QR signs</h2>
              {qrCodes.rows.length === 0 ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  This place has no printed QR sign yet. Create one so visitors can reach it from the
                  garden.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {qrCodes.rows.map((qr) => (
                    <li
                      key={qr.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
                    >
                      <span className="font-mono font-medium wrap-anywhere">{qr.publicCode}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {qr.scanCount} scans
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/qr?locationId=${detail.location.id}`}>Manage QR codes</Link>
                </Button>
              </div>
            </Card>

            <Card className="p-5 lg:col-span-2">
              <h2 className="font-heading text-base font-semibold">Trails containing this place</h2>
              {trailsContaining.length === 0 ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  This place is not part of any trail yet. Adding it to a trail gives visitors a
                  planned route and written directions to the next stop.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {trailsContaining.map((trail) => (
                    <li key={trail.id}>
                      <Link
                        href={`/admin/trails/${trail.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                      >
                        <span className="font-medium">{trail.name}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="muted">{trail.stopCount} stops</Badge>
                          <StatusBadge status={trail.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/trails">
                    <Route aria-hidden="true" />
                    Manage trails
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
