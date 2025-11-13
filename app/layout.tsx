import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FTL Dashboard Booking PT",
  description: "Dashboard Booking Personal Trainer dengan Face Recognition",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FTL Dashboard",
  },
  icons: {
    icon: [
      { url: "/logo-temp.jpg", sizes: "any", type: "image/jpeg" },
      { url: "/logo-temp.jpg", sizes: "16x16", type: "image/jpeg" },
      { url: "/logo-temp.jpg", sizes: "32x32", type: "image/jpeg" },
      { url: "/logo-temp.jpg", sizes: "192x192", type: "image/jpeg" },
      { url: "/logo-temp.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
    apple: [
      { url: "/logo-temp.jpg", sizes: "180x180", type: "image/jpeg" },
    ],
    shortcut: [
      { url: "/logo-temp.jpg", type: "image/jpeg" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#9333ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
