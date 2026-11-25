import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SIE Instacart – Executive Dashboard",
  description: "Sistem Informasi Eksekutif untuk analisis order Instacart",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
