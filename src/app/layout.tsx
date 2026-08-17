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
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="15" fill="%23E8A33D"/><text x="50" y="68" font-size="55" font-family="monospace" font-weight="bold" fill="%231B1A1F" text-anchor="middle">P</text></svg>',
  },
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
