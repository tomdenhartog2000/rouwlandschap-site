import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rouwdieren",
  description: "Verken een landschap waarin herinneringen als subtiele vonkjes verschijnen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
