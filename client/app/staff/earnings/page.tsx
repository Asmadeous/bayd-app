"use client"

import { CreditCard, Fuel, HandCoins, Users } from "lucide-react"

import { useEmployeeEarnings } from "@/lib/hooks/use-employee"
import { staffScreenClass, cardClass, eyebrowClass, mutedClass, staffTheme } from "../staff-theme"
import { StaffHeader } from "../staff-header"

function money(v: string | number | undefined | null) {
  return `$${Number(v ?? 0).toFixed(2)}`
}

export default function StaffEarningsScreen() {
  const { data, isLoading } = useEmployeeEarnings()

  return (
    <div className={staffScreenClass}>
      <StaffHeader back title="Earnings" subtitle="What you're owed and what's been paid out." />

      <div className="space-y-4 px-5">
        {isLoading || !data ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : data.account_type === "partner" ? (
          <PartnerEarnings partner={data.partner} />
        ) : (
          <DirectEarnings tips={data.tips} fuel={data.fuel_reimbursement} />
        )}
      </div>
    </div>
  )
}

// Direct (solo) staff: paid individually — tips held/paid + fuel reimbursement.
function DirectEarnings({
  tips,
  fuel,
}: {
  tips: { owed: string; paid_out: string }
  fuel: number
}) {
  const owedNow = Number(tips.owed) + Number(fuel)
  return (
    <>
      <section className="rounded-2xl bg-[#14100F] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">Owed to you now</p>
        <p className="mt-1 text-4xl font-black tracking-tight">{money(owedNow)}</p>
        <p className="mt-1 text-sm text-white/55">Tips held + fuel, before the next payout run.</p>
      </section>

      <section className={`${cardClass} p-4`}>
        <p className={eyebrowClass}>Tips</p>
        <div className="mt-2 space-y-2">
          <Line icon={HandCoins} label="Owed (held)" value={money(tips.owed)} accent />
          <Line icon={CreditCard} label="Paid out" value={money(tips.paid_out)} />
        </div>
      </section>

      <section className={`${cardClass} p-4`}>
        <p className={eyebrowClass}>Fuel &amp; mileage</p>
        <Line icon={Fuel} label="Reimbursement to date" value={money(fuel)} accent />
      </section>
    </>
  )
}

// Partner provider: compensation is the payout split. No fuel, no individual tips.
function PartnerEarnings({
  partner,
}: {
  partner: {
    name: string
    platform_fee_pct: string
    share_pct: string
    owed: string
    gross_unsettled: string
    unsettled_count: number
    paid_out: string
  }
}) {
  return (
    <>
      <section className="rounded-2xl bg-[#14100F] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">Payout owed</p>
        <p className="mt-1 text-4xl font-black tracking-tight">{money(partner.owed)}</p>
        <p className="mt-1 text-sm text-white/55">
          {partner.name} · you keep {Number(partner.share_pct).toFixed(0)}% ({Number(partner.platform_fee_pct).toFixed(0)}% platform fee).
        </p>
      </section>

      <section className={`${cardClass} p-4`}>
        <p className={eyebrowClass}>Partner payout</p>
        <div className="mt-2 space-y-2">
          <Line
            icon={Users}
            label={`Owed (${partner.unsettled_count} job${partner.unsettled_count === 1 ? "" : "s"})`}
            value={money(partner.owed)}
            accent
          />
          <Line icon={Users} label="Gross (unsettled)" value={money(partner.gross_unsettled)} />
          <Line icon={Users} label="Paid out to date" value={money(partner.paid_out)} />
        </div>
      </section>
    </>
  )
}

function Line({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof HandCoins
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-4 shrink-0" style={{ color: accent ? staffTheme.blush : "#8a8d93" }} aria-hidden />
      <span className={`flex-1 text-sm ${mutedClass}`}>{label}</span>
      <span className="text-sm font-extrabold text-[#14100F]">{value}</span>
    </div>
  )
}
