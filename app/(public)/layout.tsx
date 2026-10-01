import { CelebrationLayer } from "@/components/kids/celebration-layer";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getBranding } from "@/db/queries/gardens";

/**
 * Public visitor shell. No authentication, no account, no personal data —
 * every page in this group opens directly from a QR scan or a bookmark.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();

  return (
    <>
      <SiteHeader siteTitle={branding.siteTitle} />
      <main id="main" className="relative isolate flex-1">
        {/* Soft glows and a seed-bed texture behind every page heading. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] overflow-hidden"
        >
          <div className="dot-grid absolute inset-0" />
          <div className="absolute -top-32 -left-24 size-96 rounded-full bg-primary/10 blur-3xl animate-drift" />
          <div className="absolute -top-24 -right-24 size-[28rem] rounded-full bg-warm/20 blur-3xl animate-float-slow" />
        </div>
        {children}
      </main>
      <CelebrationLayer />
      <SiteFooter
        siteTitle={branding.siteTitle}
        gardenName={branding.gardenName}
        contactEmail={branding.contactEmail}
        contactAddress={branding.contactAddress}
      />
    </>
  );
}
