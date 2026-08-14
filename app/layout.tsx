import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/site.config";
import { createUserClient } from "@/lib/supabase/server";
import { OG_IMAGE, graph, organizationSchema, websiteSchema } from "@/lib/seo";
import AuthProvider from "./_components/AuthProvider";
import JsonLd from "./_components/JsonLd";
import SiteHeader from "./_components/SiteHeader";
import "./globals.css";

// Archivo is the system's only display/text face — 400 for body, 600 for
// emphasis, 800 for every heading, label and control.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = `${siteConfig.company.name} — ${siteConfig.company.tagline}`;

export const metadata: Metadata = {
  // Makes every relative metadata URL (canonical, OG image) absolute.
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  // Pages export a bare title ("Pricing") and the template appends the brand,
  // so the brand name can never drift between pages.
  title: { default: title, template: `%s — ${siteConfig.company.name}` },
  description: siteConfig.company.description,
  applicationName: siteConfig.company.name,
  // Deliberately no `alternates.canonical` here: children inherit it, which
  // would canonicalise every page to the homepage. Each page sets its own.
  openGraph: {
    title,
    description: siteConfig.company.description,
    siteName: siteConfig.company.name,
    locale: "en_US",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: siteConfig.company.description,
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google use full-size image previews and untruncated snippets.
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Stops browsers turning digits in the marketing copy into phone links.
  formatDetection: { telephone: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Seed auth state from the server so the global header renders correctly on
  // first paint (no logged-out flash), then AuthProvider keeps it reactive.
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        {/* Site-wide entities, emitted once. Page-level graphs reference these
            by @id rather than repeating them. */}
        <JsonLd data={graph(organizationSchema(), websiteSchema())} />
        <AuthProvider initialUser={user}>
          <SiteHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
