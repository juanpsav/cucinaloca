import type { Metadata } from "next";
import { Inter, Playfair_Display, Lora } from "next/font/google";
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
      title: "Cucina Loca - Local Ingredient Suggestions",
  description: "Refine your recipes with local ingredient alternatives based on your location",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfairDisplay.variable} ${lora.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
