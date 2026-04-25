import { AudioControls } from "@/components/shared/audio-controls";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const appFont = Inter({
  variable: "--font-app",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Hand Cricket",
  description: "Production-grade realtime multiplayer hand cricket.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${appFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>

    </html>
  );
}

