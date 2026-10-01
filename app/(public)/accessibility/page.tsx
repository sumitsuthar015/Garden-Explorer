import type { Metadata } from "next";
import Link from "next/link";
import { Accessibility, Keyboard, MonitorSmartphone, Volume2 } from "lucide-react";

import { SectionHeading } from "@/components/public/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBranding } from "@/db/queries/gardens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How Garden Explorer supports keyboard navigation, screen readers, reduced motion preferences and small screens.",
  alternates: { canonical: "/accessibility" },
};

const FEATURES = [
  {
    icon: Keyboard,
    title: "Full keyboard support",
    body: "Every control — navigation, the scanner, activities, quizzes and the trail builder — can be reached and operated with a keyboard alone. Focus is always visible, and dialogs move focus inside and return it when closed.",
  },
  {
    icon: Volume2,
    title: "Screen reader friendly",
    body: "Pages use real headings, lists and buttons rather than styled divs. Quiz feedback, progress changes and toasts are announced politely, and correct or incorrect answers are never signalled by colour alone — there is always a word and an icon.",
  },
  {
    icon: Accessibility,
    title: "Motion and contrast",
    body: "Animations are subtle and fully disabled when your device requests reduced motion. Body text, buttons and status labels are chosen to meet WCAG AA contrast on their backgrounds.",
  },
  {
    icon: MonitorSmartphone,
    title: "Small screens and large touch targets",
    body: "The visitor experience is built mobile-first from 320px upward. Buttons and quiz options are at least 44px tall so they are easy to tap while standing in the garden.",
  },
] as const;

export default async function AccessibilityPage() {
  const branding = await getBranding();

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        as="h1"
        eyebrow="Accessibility"
        title="Accessibility statement"
        description={`How ${branding.siteTitle} is built to be usable by everyone who visits the garden, including people using screen readers, keyboards, magnification or a small phone.`}
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="p-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <feature.icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-heading text-base font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-10 flex max-w-3xl flex-col gap-6">
        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">If the camera cannot be used</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The scanner on the{" "}
            <Link href="/scan" className="text-primary hover:underline">
              Scan QR
            </Link>{" "}
            page always offers an alternative: you can upload a photo or screenshot of the QR code, or
            type the code printed underneath the sign. Camera access is never required to use the
            garden trails, and no location permission is ever requested.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Reading level and language</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Learning cards are written in short paragraphs with plain wording so they work for
            children and for adults reading in a second language. Grown-up explanations are available
            for every quiz question, and no mistake is ever described as a failure.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Known limitations</h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              • Automatic QR detection relies on your browser&apos;s camera API. On very old browsers
              you will be offered the upload or manual-entry fallback instead.
            </li>
            <li>
              • Video and audio learning blocks depend on media that a garden admin has uploaded; if a
              block has no captions or transcript yet, that is a content gap, not a design choice.
            </li>
            <li>
              • This site has not been audited by an external accessibility consultancy. The
              statements above describe what has been implemented and tested.
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-heading text-lg font-semibold">Tell us about a barrier</h2>
          {branding.contactEmail ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If something here blocks you, please contact{" "}
              <a href={`mailto:${branding.contactEmail}`} className="text-primary hover:underline">
                {branding.contactEmail}
              </a>
              . We would rather fix the barrier than have you miss the garden.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This garden has not configured a contact address yet. When one is added in the admin
              settings it will appear here.
            </p>
          )}
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/scan">Try the scanner</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
