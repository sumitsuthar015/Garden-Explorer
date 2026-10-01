import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/public/section-heading";
import { Card } from "@/components/ui/card";
import { getBranding } from "@/db/queries/gardens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Garden Explorer collects, what it does not collect, and how anonymous scan analytics work.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const branding = await getBranding();

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        as="h1"
        eyebrow="Privacy"
        title="Privacy notice"
        description="This page describes exactly what this website does. It is written from the actual configuration of the site, not from a template, so if analytics are switched off the text below changes too."
      />

      <div className="mt-10 flex max-w-3xl flex-col gap-6">
        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Visitors do not have accounts</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You never create an account to use the garden trails. We do not ask for your name, email
            address, phone number, password, profile picture, birth date or any other detail about
            you. There is no visitor login anywhere on this site, and no visitor signup endpoint
            exists.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">What is stored on your device</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your progress — which places you have discovered, your points, badges, activity
            completions and quiz results — is saved in your own browser using local storage. It is
            never uploaded to our servers and it is not linked to any identity.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The same local storage entry also holds a randomly generated identifier. It is created in
            your browser and its only purpose is to let anonymous analytics recognise that two events
            came from the same visit. It contains no personal information and cannot be used to
            identify you.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            You can delete all of it at any time from the{" "}
            <Link href="/progress" className="text-primary hover:underline">
              My Progress
            </Link>{" "}
            page, or by clearing your browser storage. Clearing it removes your progress permanently —
            we hold no copy.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">
            Anonymous scan analytics — {branding.analyticsEnabled ? "currently enabled" : "currently disabled"}
          </h2>
          {branding.analyticsEnabled ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                When a QR code is scanned we record a single anonymous row: which QR sign was scanned,
                which garden place it belongs to, which trail (if any) the visitor was following, and
                the time. This is how the garden team can see which places are visited and improve
                the content.
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
                <li>• We do not store IP addresses.</li>
                <li>• We do not store your precise or approximate location. This site never uses GPS or asks where you are.</li>
                <li>• We do not use analytics cookies or third-party advertising trackers.</li>
                <li>• We do not build a profile of you or follow you across other websites.</li>
                <li>• Reports shown to garden staff are aggregate counts only — for example &quot;42 scans of the Leaf Lab sign this month&quot;.</li>
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Anonymous analytics are switched off for this garden. Scan counting and event recording
              are disabled, so no usage information is being collected at all.
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Photos and media</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Garden photographs and illustrations are stored with Cloudinary, a media hosting provider.
            When a page includes an image, your browser requests it from Cloudinary&apos;s content
            delivery network, so Cloudinary will see the standard technical details that any web
            request carries (such as your IP address) in order to deliver the file. No visitor-uploaded
            media is accepted — only signed-in garden staff can add images.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Google Maps — only if you choose</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The &quot;Visit the garden&quot; section shows an illustrated preview, not a live map, so
            nothing is loaded from Google when you open a page. Only if you press &quot;Show
            interactive map&quot; does your browser load Google Maps inside the page; Google then
            receives the standard details any web request carries and its own privacy policy
            applies. The &quot;Get directions&quot; and &quot;Open in Google Maps&quot; links simply
            take you to Google Maps in a new tab.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Staff sign-in</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Garden staff sign in to a separate administration area. That sign-in uses a secure,
            HTTP-only session cookie and a hashed password. It exists only for staff accounts and is
            completely separate from the visitor experience.
          </p>
        </Card>

        {branding.privacyNotes ? (
          <Card className="p-6">
            <h2 className="font-heading text-lg font-semibold">Additional notes from this garden</h2>
            <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
              {branding.privacyNotes.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Questions and contact</h2>
          {branding.contactEmail ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Questions about this notice can be sent to{" "}
              <a href={`mailto:${branding.contactEmail}`} className="text-primary hover:underline">
                {branding.contactEmail}
              </a>
              {branding.contactPhone ? ` or ${branding.contactPhone}` : ""}.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This garden has not configured a contact address yet, so no contact address is shown
              here. If the garden team adds one in the admin settings it will appear on this page
              automatically.
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">About compliance claims</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This page documents the site&apos;s actual data practices rather than asserting
            certification under any particular regulation. It does not claim GDPR, CCPA or any other
            compliance status. If you need that assessment for your garden, review the practices
            described above with your own adviser.
          </p>
        </Card>
      </div>
    </div>
  );
}
