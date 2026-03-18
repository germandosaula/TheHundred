import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const uiFont = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Hundred",
  description:
    "TheHundred es una guild de Albion Online enfocada en ZvZ. Únete a un gremio que quiere cambiar cómo funcionan las demás guilds.",
  icons: {
    icon: "/APP_LOGO.png",
    shortcut: "/APP_LOGO.png",
    apple: "/APP_LOGO.png",
  },
  openGraph: {
    title: "The Hundred",
    description: "Guild de Albion Online enfocada en ZvZ.",
    url: "https://www.thehundredalbion.com",
    siteName: "The Hundred",
    images: [
      {
        url: "/FondoTheHundred.png",
        width: 1200,
        height: 630,
        alt: "The Hundred Guild",
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${displayFont.variable} ${uiFont.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
