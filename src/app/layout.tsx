import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "QuakeSignal",
    template: "%s | QuakeSignal",
  },
  description: "Explora actividad sísmica a partir de fuentes públicas verificables.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geist.variable + " " + ibmPlexMono.variable}>
      <body>{children}</body>
    </html>
  );
}
