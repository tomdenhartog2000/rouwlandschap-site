import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rouwdieren",
  description: "Rouwdieren zijn eigen manieren waarop mensen verder leven met een verlies. Kijk rond bij wat anderen zelf gevonden hebben, of geef iets van jezelf vorm.",
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
