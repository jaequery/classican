import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/lib/site";
import "./globals.css";

// Inter Regular, self-hosted (SIL Open Font License; see app/fonts/Inter-OFL.txt).
const inter = localFont({
  src: "./fonts/Inter-Regular-latin.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
  fallback: ["Arial", "Helvetica", "sans-serif"],
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
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
