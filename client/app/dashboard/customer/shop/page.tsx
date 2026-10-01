"use client"

import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { ShopPage } from "@/features/shop/components/shop-page"

// The store inside the customer dashboard: same products, cart and checkout as
// the public shop, without the public site's header, hero and footer.
export default function CustomerShopPage() {
  return (
    <DashboardPage maxWidth="wide">
      <ShopPage embedded />
    </DashboardPage>
  )
}
