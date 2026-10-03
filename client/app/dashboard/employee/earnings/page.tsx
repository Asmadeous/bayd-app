"use client"

import { CreditCard, Fuel, HandCoins, Users } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { MetricCard } from "@/components/dashboard/metric-card"
import { useEmployeeEarnings } from "@/lib/hooks/use-employee"
import { formatMoney } from "@/lib/stores/franchise-store"

function money(v: string | number | undefined | null) {
  return `${formatMoney(Number(v ?? 0))}`
}

// The staff app's Earnings screen for the web: tips held and paid plus fuel for
// direct staff; the payout split for partner providers.
export default function EmployeeEarningsPage() {
  const { data, isLoading } = useEmployeeEarnings()

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader title="Earnings" subtitle="What you're owed and what's been paid out." />
      {isLoading || !data ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading earnings...</p>
        </DashboardPanel>
      ) : data.account_type === "partner" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard accent icon={Users} label="Payout owed" value={money(data.partner.owed)} />
            <MetricCard icon={Users} label="Gross (unsettled)" value={money(data.partner.gross_unsettled)} />
            <MetricCard icon={CreditCard} label="Paid out to date" value={money(data.partner.paid_out)} />
          </div>
          <DashboardPanel>
            <p className="text-sm text-[#5f6268]">
              {data.partner.name} · you keep {Number(data.partner.share_pct).toFixed(0)}% (
              {Number(data.partner.platform_fee_pct).toFixed(0)}% platform fee) · {data.partner.unsettled_count} job
              {data.partner.unsettled_count === 1 ? "" : "s"} not yet settled.
            </p>
          </DashboardPanel>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              accent
              icon={HandCoins}
              label="Owed to you now"
              value={money(Number(data.tips.owed) + Number(data.fuel_reimbursement))}
            />
            <MetricCard icon={CreditCard} label="Tips paid out" value={money(data.tips.paid_out)} />
            <MetricCard icon={Fuel} label="Fuel reimbursement to date" value={money(data.fuel_reimbursement)} />
          </div>
          <DashboardPanel>
            <p className="text-sm text-[#5f6268]">
              &ldquo;Owed to you now&rdquo; is tips held ({money(data.tips.owed)}) plus fuel, before the next payout run.
              Mileage per job is on the Shifts page.
            </p>
          </DashboardPanel>
        </>
      )}
    </DashboardPage>
  )
}
