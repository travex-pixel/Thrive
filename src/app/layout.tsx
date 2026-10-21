import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LodgeReady — Partner visa evidence, ready for ImmiAccount",
    template: "%s · LodgeReady",
  },
  description:
    "Turn hundreds of photos, statements and screenshots into organised, date-ordered PDFs that fit ImmiAccount’s 5 MB limit. Runs entirely on your device — nothing is uploaded.",
  applicationName: "LodgeReady",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: "LodgeReady",
    title: "Your partner visa evidence, ready for ImmiAccount",
    description: "Organised, date-ordered PDFs under 5 MB — built on your device. Nothing is uploaded.",
    locale: "en_AU",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
