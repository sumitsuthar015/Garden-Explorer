"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Menu, QrCode } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LevelChip } from "@/components/kids/level-chip";
import { SoundToggle } from "@/components/kids/sound-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/trails", label: "Trails" },
  { href: "/progress", label: "My Progress" },
] as const;

interface SiteHeaderProps {
  siteTitle: string;
}

/**
 * Public navigation.
 * Desktop: inline links plus a prominent Scan QR action.
 * Mobile: compact header, Sheet menu and a persistent Scan QR button so the
 * main action is never buried.
 * The bar gains a shadow once the page scrolls, and a thin reading-progress
 * line runs along its bottom edge in browsers with scroll timelines.
 */
export function SiteHeader({ siteTitle }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300",
        scrolled
          ? "border-border/80 bg-background/90 shadow-[0_10px_30px_-18px_rgb(20_58_42/0.45)] backdrop-blur-md"
          : "border-transparent bg-background/75 backdrop-blur-sm",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5 rounded-lg py-1 font-heading text-base font-bold tracking-tight"
        >
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3c8a62] to-primary text-primary-foreground shadow-[0_6px_16px_-8px_rgb(47_107_79/0.9)] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-105">
            <Leaf className="size-5 origin-bottom-left animate-sway [animation-duration:5s]" aria-hidden="true" />
          </span>
          <span className="truncate">{siteTitle}</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 bottom-1 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300",
                    active ? "scale-x-0" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LevelChip className="hidden sm:flex" />
          <SoundToggle className="hidden sm:flex" />
          <Button asChild variant="warm" size="sm" className="group hidden sm:inline-flex">
            <Link href="/scan">
              <QrCode className="transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
              Scan QR
            </Link>
          </Button>

          <Button asChild variant="warm" size="sm" className="sm:hidden">
            <Link href="/scan" aria-label="Scan a QR code">
              <QrCode aria-hidden="true" />
              Scan
            </Link>
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" title={siteTitle} description="Garden learning trails">
              <nav aria-label="Mobile" className="flex flex-col gap-1">
                {[...NAV_ITEMS, { href: "/about", label: "About" }].map((item, index) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href, pathname) ? "page" : undefined}
                      className="animate-rise rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                      style={{ animationDelay: `${80 + index * 50}ms` }}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
                <LevelChip />
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  Sounds
                  <SoundToggle />
                </span>
              </div>
              <SheetClose asChild>
                <Button asChild variant="warm" size="lg" className="mt-2 w-full">
                  <Link href="/scan">
                    <QrCode aria-hidden="true" />
                    Scan a QR Code
                  </Link>
                </Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="scroll-progress absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-primary via-[#6fae6a] to-warm"
      />
    </header>
  );
}

function isActive(href: string, pathname: string): boolean {
  if (href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
