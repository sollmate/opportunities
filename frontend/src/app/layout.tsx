import type { Metadata } from "next";
import { JetBrains_Mono, Open_Sans } from "next/font/google";

import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-sans-src",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-src",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SollMate Opportunities",
  description: "Chat with the opportunities agent",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${openSans.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
