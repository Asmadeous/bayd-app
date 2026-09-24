import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SmoothHashScroll } from "@/components/smooth-hash-scroll";
import { BaydToastProvider } from "@/components/bayd-toast-provider";
import { ConfirmProvider } from "@/components/confirm-provider";
import { Providers } from "@/app/providers";
import { SupportChatBubble } from "@/components/support/support-chat-bubble";
import { siteConfig } from "@/lib/site";
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
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: "Beauty @ Your Door | Mobile Beauty Services in the GTA",
    template: "%s | Beauty @ Your Door",
  },
  description: siteConfig.description,
  keywords: [
    "mobile beauty services",
    "women only beauty services",
    "mobile spa GTA",
    "mobile nail tech",
    "mobile manicure",
    "mobile pedicure",
    "mobile lashes",
    "mobile massage",
    "mobile facials",
    "mobile waxing",
    "Toronto beauty services",
    "Mississauga beauty services",
    "Brampton beauty services",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "/",
    siteName: siteConfig.name,
    title: "Beauty @ Your Door | Mobile Beauty Services in the GTA",
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.assets.ogImage,
        width: 1200,
        height: 630,
        alt: "Beauty @ Your Door logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beauty @ Your Door | Mobile Beauty Services in the GTA",
    description: siteConfig.description,
    images: [siteConfig.assets.twitterImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

// viewport-fit=cover is what makes env(safe-area-inset-*) report real values.
// Without it every safe-area inset resolves to 0, so the app screens'
// pt-[env(safe-area-inset-top)] / pb-[env(safe-area-inset-bottom)] collapse and
// content runs under the status bar and home indicator in the Capacitor apps.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <Providers>
          <BaydToastProvider>
            <ConfirmProvider>
              {children}
              <SupportChatBubble />
            </ConfirmProvider>
          </BaydToastProvider>
        </Providers>
      </body>
    </html>
  );
}
