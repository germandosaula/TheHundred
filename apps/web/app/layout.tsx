import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import "./globals.css";

const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"]
});

const uiFont = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "The Hundred",
  description: "Guild operations platform for Albion Online"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${displayFont.variable} ${uiFont.variable}`}>{children}</body>
    </html>
  );
}
