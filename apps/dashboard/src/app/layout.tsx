import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Without a base, page-level `openGraph.url` and canonical links are emitted
  // relative, which no link unfurler can resolve.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.moonrakersapp.org",
  ),
  title: "Moonrakers Dashboard",
  description: "Signed-in Moonrakers analytics companion dashboard",
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
