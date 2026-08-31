import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sg",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SIGAP — Peta Kewaspadaan Warga",
  description:
    "Peta keamanan real-time: laporan warga & berita, alarm bahaya, tombol SOS, dan pelacakan lokasi live untuk kerabat.",
};

export const viewport: Viewport = {
  themeColor: "#04060c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${mono.variable}`}>
      <body className="bg-abyss font-display text-slate-200 antialiased">{children}</body>
    </html>
  );
}
