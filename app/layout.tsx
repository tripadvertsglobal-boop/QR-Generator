import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/site.config";
import { createUserClient } from "@/lib/supabase/server";
import AuthProvider from "./_components/AuthProvider";
import SiteHeader from "./_components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  title,
  description: siteConfig.company.description,
  openGraph: {
    title,
    description: siteConfig.company.description,
    siteName: siteConfig.company.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: siteConfig.company.description,
  },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <AuthProvider initialUser={user}>
          <SiteHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
