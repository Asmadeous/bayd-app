import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SmoothHashScroll } from "@/components/smooth-hash-scroll";
import { TawkToChat } from "@/components/tawk-to-chat";
import { Providers } from "@/app/providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beauty Services at Your Door",
  description:
    "Mobile spa and beauty services for homes, offices, events, and spa parties across the Greater Toronto Area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothHashScroll />
        <TawkToChat />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
