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
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>
        {children}
        <a
          className="credit"
          href="https://fredrin.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Fredrin, an agentic development environment for vibe coding (opens fredrin.com in a new tab)"
        >
          {/* The Fredrin mark from fredrin.com/icon.svg: a top bar and a left bar, notched bottom-right. */}
          <svg className="credit-mark" viewBox="96 96 320 320" aria-hidden="true" focusable="false">
            <path d="M148 96H364A52 52 0 0 1 416 148V236A52 52 0 0 1 364 288H288V364A52 52 0 0 1 236 416H148A52 52 0 0 1 96 364V148A52 52 0 0 1 148 96Z" />
          </svg>
          {/* A one-line caption: the name, then who it's for. */}
          <span className="credit-tip" aria-hidden="true">
            <b>Fredrin</b>
            for cracked vibe coders
          </span>
        </a>
      </body>
    </html>
  );
}
