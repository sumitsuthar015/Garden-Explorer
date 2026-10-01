import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { TrailForm } from "@/components/admin/trail-form";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "New trail",
  robots: { index: false, follow: false },
};

export default function NewTrailPage() {
  return (
    <>
      <AdminPageHeader
        title="New trail"
        description="Name the walk and describe what visitors will learn. Stops are added on the next screen, where the order can be dragged into place."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/trails">
              <ChevronLeft aria-hidden="true" />
              All trails
            </Link>
          </Button>
        }
      />

      <TrailForm mode="create" />
    </>
  );
}
