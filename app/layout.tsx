import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Oswald } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "ReceiptIQ — know if you're being overcharged",
    template: "%s · ReceiptIQ",
  },
  description:
    "Scan a receipt. Get instant verdicts on overpriced items and hidden subscription traps. A portfolio demo — pricing data is illustrative, not live-verified.",
  applicationName: "ReceiptIQ",
  keywords: [
    "receipt scanner",
    "price check",
    "overcharge detector",
    "subscription trap",
    "hidden fees",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ReceiptIQ",
  },
  openGraph: {
    type: "website",
    siteName: "ReceiptIQ",
    title: "ReceiptIQ",
    description:
      "Scan a receipt. Get instant verdicts on overpriced items and hidden subscription traps.",
    images: [
      { url: "/og/receiptiq-og-image.webp", width: 1200, height: 630, alt: "ReceiptIQ" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReceiptIQ",
    description:
      "Scan a receipt. Get instant verdicts on overpriced items and hidden subscription traps.",
    images: ["/og/receiptiq-og-image.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7ee",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexMono.variable} ${oswald.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
