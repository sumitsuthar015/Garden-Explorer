import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, Manrope } from "next/font/google";

import { ProgressHydrator } from "@/components/providers/progress-hydrator";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { Toaster } from "@/components/ui/sonner";
import { getBranding } from "@/db/queries/gardens";
import { GARDEN_PHOTO_INFO } from "@/lib/garden-photo-info";
import { getSiteOrigin } from "@/lib/site-url";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

/** Rounded, friendly display face for headings — the site is mostly used by kids. */
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  // Warm off-white document colour so the mobile address bar matches the page.
  themeColor: "#F7F8F3",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export async function generateMetadata(): Promise<Metadata> {
  const [branding, origin] = await Promise.all([getBranding(), getSiteOrigin()]);
  const title = `${branding.siteTitle} — QR learning trails for kids`;
  const description = branding.seoDescription;

  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: `%s | ${branding.siteTitle}`,
    },
    description,
    applicationName: branding.siteTitle,
    manifest: "/manifest.webmanifest",
    alternates: { canonical: "/" },
    icons: {
      icon: branding.faviconUrl
        ? [{ url: branding.faviconUrl }]
        : [
            { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
            { url: "/icons/icon.svg", type: "image/svg+xml" },
          ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      type: "website",
      siteName: branding.siteTitle,
      title,
      description,
      url: origin,
      // A real photo: link previews (WhatsApp, Facebook, X) do not render SVG.
      images: [{ url: GARDEN_PHOTO_INFO.gate.url, width: 1280, height: 960, alt: GARDEN_PHOTO_INFO.gate.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [GARDEN_PHOTO_INFO.gate.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${fredoka.variable} h-full antialiased`}
      // Tells Next.js the document scrolls smoothly, so it pauses that during
      // route transitions instead of animating past the sticky header.
      data-scroll-behavior="smooth"
    >
      <head>
        {/*
          Brand colour is applied through the existing CSS variable so admins can
          rebrand from /admin/settings without a code change or redeploy.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--primary:${branding.primaryColor};}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <ProgressHydrator />
        {children}
        <PwaProvider />
        <Toaster />
      </body>
    </html>
  );
}
