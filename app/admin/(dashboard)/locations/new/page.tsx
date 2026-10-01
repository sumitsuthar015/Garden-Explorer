import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LocationForm } from "@/components/admin/location-form";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New location",
  robots: { index: false, follow: false },
};

export default function NewLocationPage() {
  return (
    <>
      <AdminPageHeader
        title="Create a garden place"
        description="Start with the basics. You can add learning cards, observation activities and a quiz immediately afterwards."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/locations">
              <ArrowLeft aria-hidden="true" />
              Back to locations
            </Link>
          </Button>
        }
      />

      <LocationForm mode="create" />
    </>
  );
}
