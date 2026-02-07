import type { Metadata } from "next";
import { Inter, Playfair_Display, Lora } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from './contexts/ThemeContext';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: 'swap',
});

const lora = Lora({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-lora",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Cucina Loca - Local Ingredient Alternatives for Any Recipe",
  description: "Discover local, seasonal ingredient alternatives for any recipe based on your location. AI-powered chef analysis and cooking assistant.",
  openGraph: {
    title: "Cucina Loca",
    description: "Smarter recipes, rooted in your region.",
    type: "website",
  },
  metadataBase: new URL('https://cucinaloca.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfairDisplay.variable} ${lora.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
