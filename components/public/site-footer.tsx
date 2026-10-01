import Link from "next/link";
import { ArrowUpRight, Leaf, MapPin, Navigation } from "lucide-react";

import { GARDEN_LOCATION } from "@/lib/constants";

interface SiteFooterProps {
  siteTitle: string;
  gardenName: string;
  contactEmail: string | null;
  contactAddress: string | null;
  showAdminLink?: boolean;
}

const EXPLORE_LINKS = [
  { href: "/explore", label: "Garden places" },
  { href: "/trails", label: "Learning trails" },
  { href: "/scan", label: "Scan a QR code" },
  { href: "/progress", label: "My progress" },
] as const;

const linkClass =
  "group inline-flex w-fit items-center gap-1 text-white/70 transition-colors hover:text-white";

export function SiteFooter({
  siteTitle,
  gardenName,
  contactEmail,
  contactAddress,
  showAdminLink = true,
}: SiteFooterProps) {
  return (
    <footer className="relative mt-16 text-white">
      {/* Rolling hill edge rising out of the page. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="block h-10 w-full sm:h-16"
      >
        <path
          d="M0 80V46C180 14 360 8 560 30C760 52 940 64 1140 38C1260 22 1360 20 1440 30V80Z"
          fill="#1f5039"
          opacity="0.55"
        />
        <path
          d="M0 80V58C220 30 420 34 640 50C860 66 1080 58 1260 42C1340 35 1400 36 1440 40V80Z"
          fill="#143a2a"
        />
      </svg>

      <div className="relative isolate overflow-hidden bg-[#143a2a]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-[-8rem] -z-10 size-96 rounded-full bg-warm/10 blur-3xl animate-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-[-6rem] -z-10 size-80 rounded-full bg-[#6fae6a]/15 blur-3xl animate-float-slow"
        />

        <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#9fd08b] ring-1 ring-white/15">
                <Leaf className="size-5 origin-bottom-left animate-sway [animation-duration:5s]" aria-hidden="true" />
              </span>
              <span className="font-heading text-lg font-bold">{siteTitle}</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Scan the QR signs in {gardenName} and learn science, logic and coding as you walk —
              with quizzes, XP and badges to collect.
            </p>
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 ring-1 ring-white/10">
              <span className="size-1.5 animate-twinkle rounded-full bg-[#9fd08b]" aria-hidden="true" />
              No account needed — ever
            </p>
          </div>

          <nav aria-label="Explore" className="flex flex-col gap-2.5 text-sm">
            <h2 className="font-heading text-sm font-semibold text-[#f5d58f]">Explore</h2>
            {EXPLORE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <nav aria-label="About" className="flex flex-col gap-2.5 text-sm">
            <h2 className="font-heading text-sm font-semibold text-[#f5d58f]">About</h2>
            <Link href="/about" className={linkClass}>
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                About the garden
              </span>
            </Link>
            <Link href="/privacy" className={linkClass}>
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                Privacy
              </span>
            </Link>
            <Link href="/accessibility" className={linkClass}>
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                Accessibility
              </span>
            </Link>
            {showAdminLink ? (
              <Link href="/admin/login" className={linkClass}>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  Staff sign in
                </span>
              </Link>
            ) : null}
          </nav>

          <div className="flex flex-col gap-3 text-sm">
            <h2 className="font-heading text-sm font-semibold text-[#f5d58f]">Visit</h2>
            <p className="flex gap-2 text-white/70">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#9fd08b]" aria-hidden="true" />
              <span>
                <span className="block font-medium text-white">{GARDEN_LOCATION.name}</span>
                {contactAddress ?? GARDEN_LOCATION.address}
              </span>
            </p>
            <p className="flex gap-2 text-white/70">
              <span aria-hidden="true" className="w-4 shrink-0 text-center">
                🕓
              </span>
              <span>Open {GARDEN_LOCATION.openingHours.toLowerCase()}</span>
            </p>
            <a
              href={GARDEN_LOCATION.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-fit items-center gap-2 rounded-full bg-warm px-4 py-2 font-medium text-warm-foreground shadow-[0_8px_20px_-10px_rgb(231_183_91/0.9)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              <Navigation className="size-4 transition-transform duration-300 group-hover:rotate-12" aria-hidden="true" />
              Get directions
              <span className="sr-only">(opens Google Maps in a new tab)</span>
            </a>
            <a
              href={GARDEN_LOCATION.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Open in Google Maps
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="w-fit text-[#9fd08b] hover:underline">
                {contactEmail}
              </a>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {siteTitle} · {gardenName}
            </p>
            <p>No account needed. Progress is stored only in your own browser.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
