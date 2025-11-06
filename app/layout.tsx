import "./globals.css";
import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "700"] });
const rajdhani = Rajdhani({ subsets: ["latin"], variable: "--font-rajdhani", weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "NeuroGrid: AI Puzzle Challenge",
  description: "Battle a neural strategist in a procedurally generated logic puzzle."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${rajdhani.variable}`}>
      <body>{children}</body>
    </html>
  );
}
