"use client";

import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { PricingPage } from "@/features/pricing/components/pricing-page";
import { FACIAL_SERVICES, pricingCategories } from "@/features/pricing/data";
import type { PriceCategory, PriceItem } from "@/features/pricing/types";

interface ApiService {
  id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
  category_name: string | null;
  requires_consultation: boolean;
}

// Presentation metadata the API doesn't carry (order, summary blurb, card
// accent). Keyed by the category name the API returns. The order here is the
// order categories appear on the page; anything not listed falls to the end.
const CATEGORY_META: Record<
  string,
  { id: string; summary: string; accent: string; order: number }
> = {
  Nails: {
    id: "nails",
    summary: "Manicures, pedicures, gel, shellac, refills, polish changes, and nail care.",
    accent: "bg-white/80",
    order: 1,
  },
  Lashes: {
    id: "lashes",
    summary: "Classic, hybrid, volume, glam, and mega sets plus refills.",
    accent: "bg-[#f7ede9]",
    order: 2,
  },
  Massage: {
    id: "massages",
    summary: "Relaxation, deep tissue, and focused body work.",
    accent: "bg-[#eef1ec]",
    order: 3,
  },
  Waxing: {
    id: "waxing",
    summary: "Face and body waxing arranged around your appointment.",
    accent: "bg-white/80",
    order: 4,
  },
  Facials: {
    id: "facials",
    summary: "Facials, peels, back treatments, and facial, scalp, and lymphatic massage with Rim.",
    accent: "bg-[#eef1ec]",
    order: 5,
  },
  Spa: {
    id: "spa",
    summary: "Spa manicures, body scrubs, and group pampering.",
    accent: "bg-[#f7ede9]",
    order: 6,
  },
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Turn the flat API service list into the grouped PriceCategory[] the design
// expects, preserving CATEGORY_META order and carrying the description through.
function toPriceCategories(services: ApiService[]): PriceCategory[] {
  const byCategory = new Map<string, ApiService[]>();
  for (const svc of services) {
    const key = svc.category_name ?? "Other";
    byCategory.set(key, [...(byCategory.get(key) ?? []), svc]);
  }

  return Array.from(byCategory.entries())
    .map(([categoryName, list]) => {
      const meta = CATEGORY_META[categoryName];
      const items: PriceItem[] = list.map((svc) => ({
        name: svc.name,
        price: svc.requires_consultation
          ? "Quote"
          : `$${Number(svc.price).toFixed(0)}`,
        duration: `${svc.duration_minutes} min`,
        description: svc.description ?? undefined,
      }));

      return {
        category: {
          id: meta?.id ?? slugify(categoryName),
          title: categoryName,
          summary: meta?.summary,
          accent: meta?.accent ?? "bg-white/80",
          items,
        } satisfies PriceCategory,
        order: meta?.order ?? 99,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.category);
}

export function LivePricingPage() {
  const { data: services, isLoading, isError } = useQuery<ApiService[]>({
    queryKey: ["public-services"],
    queryFn: () => api.get<ApiService[]>("/services").then((r) => r.data),
  });

  // While loading, or if the API is unreachable, fall back to the static menu
  // so the page never renders empty. Facials are a real seeded category, so the
  // static copy only fills in for the fallback.
  const categories =
    !isLoading && !isError && services && services.length > 0
      ? toPriceCategories(services)
      : [...pricingCategories, FACIAL_SERVICES];

  return <PricingPage categories={categories} />;
}
