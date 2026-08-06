import type { Metadata } from "next";

import { PricingPage } from "@/features/pricing/components/pricing-page";
import { pricingCategories } from "@/features/pricing/data";
import type { PriceCategory } from "@/features/pricing/types";

export const metadata: Metadata = {
  title: "Mobile Beauty Services & Prices",
  description:
    "Explore women-only mobile beauty services and prices for nails, massage, feet, waxing, lashes, facials, manicure, and pedicure appointments across the west end GTA.",
  alternates: {
    canonical: "/services",
  },
};

const FACIAL_SERVICES: PriceCategory = {
  id: "facials",
  title: "Facial Services",
  summary:
    "Personalized facial care, targeted treatments, and relaxation-focused options.",
  accent: "bg-white/80",
  items: [
    {
      name: "Basic / Express Facial",
      duration: "30–60 min",
      price: "$80–$150",
    },
    {
      name: "Signature / Hydrating Facial",
      duration: "60–90 min",
      price: "$120–$200",
    },
    {
      name: "Anti-Aging / Collagen-Boosting Facial",
      duration: "60–90 min",
      price: "$150–$250+",
    },
    {
      name: "Acne / Problem Skin Facial",
      duration: "60–90 min",
      price: "$140–$230",
    },
    {
      name: "Brightening / Glow Facial",
      duration: "60–90 min",
      price: "$130–$220",
    },
    {
      name: "Sensitive / Soothing Facial",
      duration: "60–90 min",
      price: "$120–$200",
    },
    {
      name: "Chemical Peel (Light / Superficial)",
      duration: "30–60 min",
      price: "$100–$200+",
    },
    {
      name: "Back Facial",
      duration: "45–75 min",
      price: "$90–$180",
    },
    {
      name: "Relaxation Massage (Full Body or Targeted)",
      duration: "30–90 min",
      price: "$80–$180",
    },
    {
      name: "Facial Massage (Add-on or Standalone)",
      duration: "20–45 min",
      price: "$50–$120",
    },
  ],
};

export default function Services() {
  return <PricingPage categories={[...pricingCategories, FACIAL_SERVICES]} />;
}
