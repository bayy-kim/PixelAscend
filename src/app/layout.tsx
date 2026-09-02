import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  variable: "--font-press-start",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PixelAscend — Retro Pixel RPG Board Game",
  description: "Main Ular Tangga RPG Multiplayer Chibi Pixel Art 2–8 pemain secara real-time dari HP-mu!",
  metadataBase: new URL("https://pixel-ascend.vercel.app"),
  openGraph: {
    title: "PixelAscend — Retro Pixel RPG Board Game",
    description: "Main Ular Tangga RPG Multiplayer Chibi Pixel Art 2–8 pemain secara real-time dari HP-mu!",
    url: "https://pixel-ascend.vercel.app",
    siteName: "PixelAscend",
    images: [
      {
        url: "/themes/wanderers-path/board.png",
        width: 1200,
        height: 630,
        alt: "PixelAscend Board Preview",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelAscend — Retro Pixel RPG Board Game",
    description: "Main Ular Tangga RPG Multiplayer Chibi Pixel Art 2–8 pemain secara real-time dari HP-mu!",
    images: ["/themes/wanderers-path/board.png"],
  },
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
