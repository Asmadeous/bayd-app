import type { Metadata } from "next";

import { LivePricingPage } from "@/features/pricing/components/live-pricing-page";

export const metadata: Metadata = {
  title: "Mobile Beauty Services & Prices",
  description:
    "Explore women-only mobile beauty services and prices for nails, massage, feet, waxing, lashes, facials, manicure, and pedicure appointments across the west end GTA.",
  alternates: {
    canonical: "/services",
  },
};

export default function Services() {
  return <LivePricingPage />;
}
