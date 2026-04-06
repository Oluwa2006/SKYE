import type { Metadata } from "next";
import { DM_Sans, Josefin_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  weight: ["100", "300", "400", "600", "700"],
  variable: "--font-josefin",
});

export const metadata: Metadata = {
  title: "Agentica",
  description: "AI-powered creative intelligence platform",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${josefinSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
