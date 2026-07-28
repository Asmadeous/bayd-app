import type { Metadata } from "next";
import {
  BadgePercent,
  Footprints,
  Hand,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PricingPage } from "@/features/pricing/components/pricing-page";
import type { PriceCategory } from "@/features/pricing/types";

export const metadata: Metadata = {
  title: "Prices | Beauty at Your Door",
  description:
    "Browse mobile beauty service prices for nails, massage, feet, waxing, and lashes across Ontario.",
};

interface ApiService {
  id: number;
  name: string;
  price: string;
}

interface ApiServiceCategory {
  id: number;
  name: string;
  slug: string;
  position: number;
  services: ApiService[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  nails: Hand,
  massages: HeartPulse,
  feet: Footprints,
  waxing: BadgePercent,
  lashes: Sparkles,
};

const CATEGORY_SUMMARIES: Record<string, string> = {
  nails: "Gel, shellac, refills, polish changes, and hand care.",
  massages: "Focused body work and relaxation services brought home.",
  feet: "Pedicures, foot care, polish, and comfort-focused add-ons.",
  waxing: "Face and body waxing options for at-home appointments.",
  lashes: "Classic, hybrid, volume, glam, and mega volume sets.",
};

function mapApiCategory(cat: ApiServiceCategory): PriceCategory {
  return {
    id: cat.slug,
    title: cat.name,
    summary: CATEGORY_SUMMARIES[cat.slug],
    accent: "bg-white/80",
    icon: CATEGORY_ICONS[cat.slug],
    items: cat.services.map((s) => ({
      name: s.name,
      price: `$${Number(s.price).toFixed(0)}`,
    })),
  };
}

export default async function Prices() {
  const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

  const res = await fetch(`${BASE_URL}/service_categories`, {
    next: { revalidate: 60 },
  });

  const apiCategories: ApiServiceCategory[] = res.ok ? await res.json() : [];
  const categories = apiCategories.map(mapApiCategory);

  return <PricingPage categories={categories} />;
}
