import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/lib/site";
import "./globals.css";

// Self-hosted serifs (SIL Open Font License; see app/fonts/*-OFL.txt).
// Playfair Display sets the piece's title like an engraved concert programme;
// Source Serif 4 carries everything else, sturdy enough to read across a room.
const display = localFont({
  src: "./fonts/PlayfairDisplay-SemiBold-latin.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const text = localFont({
  src: [
    { path: "./fonts/SourceSerif4-Medium-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/SourceSerif4-SemiBold-latin.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-text",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: `${site.name} · ${site.tagline}`,
  description: site.description,
  icons: { icon: "data:," },
};

export const viewport: Viewport = {
  themeColor: "#181818",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
