import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Leaf, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminSession } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  // Only ever redirect to an internal admin path — never to an external URL.
  const next = rawNext && /^\/admin(\/[\w\-/[\]()]*)?$/.test(rawNext) ? rawNext : "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-accent/50 to-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Leaf className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold">Garden Explorer Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to manage garden places, QR codes and trails.
            </p>
          </div>
        </div>

        <Card className="p-6 sm:p-7">
          <LoginForm redirectTo={next} />
        </Card>

        <p className="mt-5 inline-flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This area is for garden staff only. Visitors never need an account — the QR learning
          experience opens straight from a scan.
        </p>

        <div className="mt-5">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft aria-hidden="true" />
              Back to the garden
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
