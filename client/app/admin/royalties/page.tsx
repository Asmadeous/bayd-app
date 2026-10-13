"use client"

import { useState } from "react"

import { useToast } from "@/lib/app-ui/app-ui-provider"
import {
  useFranchises,
  useGenerateStatement,
  useMarkStatementPaid,
  useMyRoyaltyStatements,
  useRoyaltyStatements,
  type RoyaltyStatement,
} from "@/lib/hooks/use-super"
import { useAuthStore } from "@/lib/stores/auth-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, eyebrowClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, fieldClass } from "../ui"

const lastMonth = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

const money = (value: string | number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value) || 0)

// The web Royalties page: what each franchise owes the brand each month. Super
// admins see, build and settle every franchise's; a franchise admin sees their
// own.
export default function AdminRoyaltiesScreen() {
  const isSuper = useAuthStore((s) => s.user?.role === "super_admin")
  const { toast } = useToast()
  const { data: franchises = [] } = useFranchises(isSuper)
  const [franchiseId, setFranchiseId] = useState<number | "">("")
  const [month, setMonth] = useState(lastMonth)
  const all = useRoyaltyStatements(franchiseId === "" ? undefined : franchiseId, isSuper)
  const mine = useMyRoyaltyStatements(!isSuper)
  const generate = useGenerateStatement()
  const markPaid = useMarkStatementPaid()
  const statements = (isSuper ? all.data : mine.data) ?? []

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Royalties" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>The royalty percentage of money received each month, per franchise.</p>
      <div className="space-y-3 px-5">
        {isSuper ? (
          <section className={`${cardClass} space-y-3 p-4`}>
            <label className="block">
              <span className={eyebrowClass}>Franchise</span>
              <select className={`${fieldClass} mt-1`} value={franchiseId} onChange={(e) => setFranchiseId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">All franchises</option>
                {franchises.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={eyebrowClass}>Month</span>
              <input type="month" className={`${fieldClass} mt-1`} value={month} onChange={(e) => setMonth(e.target.value || lastMonth())} />
            </label>
            <button
              type="button"
              disabled={franchiseId === "" || generate.isPending}
              onClick={() =>
                franchiseId !== "" &&
                generate.mutate(
                  { franchiseId, month },
                  {
                    onSuccess: () => toast({ title: "Statement updated", variant: "success" }),
                    onError: (e) => toast({ title: "Statement not built", description: apiError(e, "Please try again."), variant: "error" }),
                  },
                )
              }
              className="h-11 w-full rounded-xl bg-[#C96C83] text-sm font-bold text-white disabled:opacity-40"
            >
              Build statement
            </button>
            <p className={`text-xs ${mutedClass}`}>Statements for every live franchise are also built automatically on the 1st of each month.</p>
          </section>
        ) : null}

        {statements.length === 0 ? (
          <EmptyCard title="No statements yet" body="Monthly royalty statements appear here." />
        ) : (
          statements.map((s: RoyaltyStatement) => (
            <section key={s.id} className={`${cardClass} space-y-1 p-4`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold">{isSuper ? s.franchise_name : s.period_start.slice(0, 7)}</span>
                <span className={`text-sm font-semibold ${s.status === "paid" ? "text-green-700" : mutedClass}`}>
                  {s.status === "paid" ? `Paid${s.paid_at ? ` ${s.paid_at.slice(0, 10)}` : ""}` : "Open"}
                </span>
              </div>
              {isSuper ? <p className={`text-sm ${mutedClass}`}>{s.period_start.slice(0, 7)}</p> : null}
              <p className="text-sm">
                Received {money(s.gross, s.currency)} · refunds {money(s.refunds, s.currency)}
              </p>
              <p className="text-lg font-black">
                {money(s.royalty_due, s.currency)} <span className={`text-sm font-normal ${mutedClass}`}>({Number(s.royalty_pct)}%)</span>
              </p>
              {isSuper && s.status === "open" ? (
                <button
                  type="button"
                  disabled={markPaid.isPending}
                  onClick={() => markPaid.mutate(s.id)}
                  className="mt-1 h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold disabled:opacity-40"
                >
                  Mark paid
                </button>
              ) : null}
            </section>
          ))
        )}
      </div>
    </div>
  )
}
