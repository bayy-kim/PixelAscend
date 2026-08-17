import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  variable: "--font-press-start",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PixelAscend",
  description: "Ular tangga multiplayer bertema fantasi chibi pixel art.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#1B1A1F] text-[#F2E9D8] font-sans">
        {children}
      </body>
    </html>
  );
}
