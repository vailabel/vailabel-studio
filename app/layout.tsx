import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vison AI Labeling Tool",
  description: "A simple image labeling tool for computer vision projects",
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
