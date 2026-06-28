import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CleanPass | Premium Vehicle Auto Spa Business Ecosystem",
  description: "The all-in-one digital companion suite connecting vehicle wash owners, modern stations, and daily customers effortlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Added data-scroll-behavior="smooth" here
    <html lang="en" className={`${inter.variable}`} data-scroll-behavior="smooth">
      <body className="bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}