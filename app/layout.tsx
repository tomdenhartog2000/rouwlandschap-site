import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rouwdieren",
  description: "Ontdek en vorm rouwdieren: persoonlijke vormen voor wat met je meeleeft na verlies.",
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
