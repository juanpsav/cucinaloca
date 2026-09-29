import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cucina Loca",
  description:
    "Cook from any recipe online without the clutter, and change it to fit your kitchen.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#15120f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
