import type { Metadata } from "next";

import { ShopPage } from "@/features/shop/components/shop-page";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse beauty essentials, aftercare kits, and appointment add-ons from Beauty @ Your Door.",
  alternates: {
    canonical: "/shop",
  },
};

export default function Shop() {
  return <ShopPage />;
}
