import type { Metadata } from "next";

/**
 * Admin area wrapper.
 *
 * Deliberately does NOT perform authentication itself: /admin/login lives
 * inside it and must stay reachable. Authentication happens in
 * `app/admin/(dashboard)/layout.tsx` for every protected route, and again in
 * each server action through `requireAdminPermission()`.
 */
export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Garden Explorer Admin",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
