"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { AppHeader } from "../app-header"
import { appScreenClass } from "../app-theme"
import { GiftCardsList } from "../gift-cards/page"
import { LoyaltyPanel } from "../loyalty/page"
import { OrdersList } from "../orders/page"
import { SegmentedTabs } from "../segmented-tabs"
import { TransactionsList } from "../transactions/page"

const SECTIONS = [
  { key: "orders", label: "Orders" },
  { key: "transactions", label: "Transactions" },
  { key: "gift-cards", label: "Gift cards" },
  { key: "loyalty", label: "Loyalty" },
] as const
type Section = (typeof SECTIONS)[number]["key"]

// The Management tab: orders, transactions (receipts), gift cards and loyalty
// points, switched at the top. The choice lives in the URL (?tab=) so Back returns to it.
// useSearchParams needs a Suspense boundary for the static app export.
export default function ManageScreen() {
  return (
    <Suspense>
      <Manage />
    </Suspense>
  )
}

function Manage() {
  const router = useRouter()
  const param = useSearchParams().get("tab")
  const section: Section = SECTIONS.some((s) => s.key === param) ? (param as Section) : "orders"

  return (
    <div className={appScreenClass}>
      <AppHeader title="Management" />
      <div className="px-5">
        <SegmentedTabs tabs={SECTIONS} value={section} onChange={(key) => router.replace(`/app/manage?tab=${key}`)} />
        {section === "orders" ? (
          <OrdersList />
        ) : section === "transactions" ? (
          <TransactionsList />
        ) : section === "gift-cards" ? (
          <GiftCardsList />
        ) : (
          <LoyaltyPanel />
        )}
      </div>
    </div>
  )
}
