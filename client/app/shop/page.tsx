import type { Metadata } from "next";

import { ShopPage } from "@/features/shop/components/shop-page";

export const metadata: Metadata = {
  title: "Shop | Beauty at Your Door",
  description:
    "Browse beauty essentials, aftercare kits, and appointment add-ons from Beauty at Your Door.",
};

export default function Shop() {
  return <ShopPage />;
}
