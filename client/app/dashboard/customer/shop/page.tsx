"use client"

import { ShopPage } from "@/features/shop/components/shop-page"

// The store, reachable from inside the customer dashboard/app so customers can
// browse + buy products without leaving the app. Reuses the existing ShopPage.
export default function CustomerShopPage() {
  return <ShopPage />
}
