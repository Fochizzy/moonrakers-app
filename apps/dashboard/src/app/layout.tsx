import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Without a base, page-level `openGraph.url` and canonical links are emitted
  // relative, which no link unfurler can resolve.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.moonrakersapp.org",
  ),
  title: "Moonraker’s Analytics",
  description:
    "The signed-in companion dashboard for Moonraker’s Analytics, the app that tracks a game of Moonrakers turn by turn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
