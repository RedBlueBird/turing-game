import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FeedbackButton from "@/components/FeedbackButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turing Game",
  description: "Social deduction between human & AI",
  openGraph: {
    title: "Turing Game",
    description: "Social deduction between human & AI",
    images: [
      {
        url: "/robot-face.png",
        width: 400,
        height: 400,
        alt: "Minimalist robot face for Turing Game"
      }
    ],
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}
