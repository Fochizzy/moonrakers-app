import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
