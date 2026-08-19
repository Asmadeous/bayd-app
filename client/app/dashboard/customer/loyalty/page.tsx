"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Gift, Star } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { MetricCard } from "@/components/dashboard/metric-card"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useLoyalty, useReferral } from "@/lib/hooks/use-account"
import { customerLoyaltySteps } from "@/lib/tours/customer-loyalty-tour"

export default function CustomerLoyaltyPage() {
  const { toast } = useToast()
  const { data: loyalty, isError: loyaltyError, isLoading } = useLoyalty()
  const { data: referral, isError: referralError } = useReferral()
  const [copied, setCopied] = useState(false)

  const transactions = loyalty?.loyalty_transactions ?? []
  const earned = transactions
    .filter((transaction) => transaction.points > 0)
    .reduce((sum, transaction) => sum + transaction.points, 0)
  const redeemed = transactions
    .filter((transaction) => transaction.points < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.points), 0)

  useEffect(() => {
    if (loyaltyError) {
      toast({
        title: "Loyalty details could not be loaded",
        description: "Refresh the page or try again shortly.",
        variant: "error",
      })
    }
  }, [loyaltyError, toast])

  useEffect(() => {
    if (referralError) {
      toast({
        title: "Referral link could not be loaded",
        description: "Refresh the page or try again shortly.",
        variant: "error",
      })
    }
  }, [referralError, toast])

  async function copyReferral() {
    if (!referral?.url) {
      toast({
        title: "Referral link unavailable",
        description: "Refresh the page and try again.",
        variant: "error",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(referral.url)
      setCopied(true)
      toast({ title: "Referral link copied", variant: "success" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Referral link could not be copied",
        description: "Your browser blocked clipboard access.",
        variant: "error",
      })
    }
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="customer-loyalty-header">
        <DashboardHeader
          title="Loyalty Program"
          subtitle="Earn points on every booking and redeem them for future beauty services."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3" data-tour="customer-loyalty-metrics">
        <MetricCard
          accent
          icon={Star}
          label="Points Balance"
          value={isLoading ? "-" : loyalty?.points_balance ?? 0}
        />
        <MetricCard icon={Check} label="Points Earned" value={isLoading ? "-" : earned} />
        <MetricCard icon={Gift} label="Points Redeemed" value={isLoading ? "-" : redeemed} />
      </div>

      {referral ? (
        <DashboardPanel className="space-y-4" data-tour="customer-loyalty-referral">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center border border-black/10 bg-[#f4f1eb] text-[#c96c83]">
              <Gift aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-[#101217]">Refer a friend</h2>
              <p className="mt-1 text-xs font-semibold text-[#5f6268]">
                {referral.referrals_count} referrals so far
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[#5f6268]">
            Share your link. When a friend completes their first booking, you earn{" "}
            <span className="font-bold text-[#101217]">{referral.points_per_referral} points</span>.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-10 flex-1 border border-black/15 bg-[#f4f1eb] px-3 text-sm font-semibold text-[#5f6268] outline-none"
              readOnly
              value={referral.url}
            />
            <Button
              onClick={copyReferral}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </DashboardPanel>
      ) : null}

      <DashboardPanel data-tour="customer-loyalty-history">
        <h2 className="text-sm font-extrabold text-[#101217]">Points history</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-[#5f6268]">Loading points history...</p>
        ) : transactions.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Star}
            title="No points activity yet"
            description="Complete a booking to start earning points."
          />
        ) : (
          <div className="mt-4 divide-y divide-black/8">
            {transactions.map((transaction) => (
              <div className="flex items-center justify-between gap-4 py-3" key={transaction.id}>
                <div>
                  <p className="text-sm font-semibold text-[#101217]">
                    {transaction.description || transaction.kind}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#5f6268]">
                    {formatDate(transaction.created_at)}
                  </p>
                </div>
                <span
                  className="text-sm font-extrabold"
                  style={{ color: transaction.points >= 0 ? "#5a9e5a" : "#d4754a" }}
                >
                  {transaction.points >= 0 ? "+" : ""}
                  {transaction.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>

      <TutorialButton steps={customerLoyaltySteps} pageKey="customer-loyalty" />
    </DashboardPage>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-CA")
}
