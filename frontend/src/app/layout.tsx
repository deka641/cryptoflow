import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "./client-layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | CryptoFlow",
    default: "CryptoFlow — Real-Time Crypto Analytics",
  },
  description: "Real-time cryptocurrency analytics platform with market data, portfolio tracking, quantitative analysis, and data pipeline monitoring for the top 50 coins.",
  openGraph: {
    type: "website",
    siteName: "CryptoFlow",
    title: "CryptoFlow — Real-Time Crypto Analytics",
    description: "Real-time cryptocurrency analytics platform with market data, portfolio tracking, quantitative analysis, and data pipeline monitoring.",
  },
  twitter: {
    card: "summary",
    title: "CryptoFlow — Real-Time Crypto Analytics",
    description: "Real-time cryptocurrency analytics platform with market data, portfolio tracking, and quantitative analysis.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-white`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
