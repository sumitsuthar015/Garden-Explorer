"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  Route,
  Settings,
  User,
} from "lucide-react";

import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/lib/toast";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Only highlight when the path matches exactly (used by the dashboard). */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/qr", label: "QR Codes", icon: QrCode },
  { href: "/admin/trails", label: "Trails", icon: Route },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/quizzes", label: "Quizzes", icon: HelpCircle },
  { href: "/admin/badges", label: "Badges", icon: Award },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminShellProps {
  user: { name: string; email: string; role: "admin" | "editor" };
  children: React.ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const activeItem = NAV_ITEMS.filter((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
  ).sort((a, b) => b.href.length - a.href.length)[0];


  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out", "Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const navigation = (
    <nav aria-label="Admin sections" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Desktop sidebar: stays put while the page scrolls; scrolls itself only if it overflows. */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:self-start">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-bold">Garden Explorer</p>
            <p className="text-[11px] text-muted-foreground">Admin</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{navigation}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon-sm" className="lg:hidden" aria-label="Open admin menu">
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" title="Garden Explorer" description="Admin">
                <div className="mt-2">{navigation}</div>
              </SheetContent>
            </Sheet>

            <h1 className="truncate font-heading text-base font-semibold sm:text-lg">
              {activeItem?.label ?? "Admin"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/" target="_blank" rel="noopener noreferrer">
                View site
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Account menu">
                  <User aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate">{user.name}</span>
                  <span className="block truncate text-[11px] font-normal normal-case">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">Settings & password</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleSignOut();
                  }}
                  disabled={signingOut}
                >
                  <LogOut />
                  {signingOut ? "Signing out…" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
