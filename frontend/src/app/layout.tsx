import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Opportunities Agent",
  description: "Chat with the opportunities agent",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
