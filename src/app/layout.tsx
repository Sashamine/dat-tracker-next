import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { BottomNavigation } from "@/components/bottom-navigation";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SiteJsonLd, DatasetJsonLd, FAQJsonLd } from "@/components/json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "DAT Tracker - Digital Asset Treasury Companies",
  description: "Real-time tracking of public companies holding crypto assets",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DAT Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <SiteJsonLd />
        <DatasetJsonLd />
        <FAQJsonLd />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ServiceWorkerRegister />
          <div className="pb-16 lg:pb-0">{children}</div>
          <BottomNavigation />
        </Providers>
      </body>
    </html>
  );
}
