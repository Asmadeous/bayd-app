"use client"

import { useState } from "react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { Button } from "@/components/ui/button"
import {
  useFranchises,
  useGenerateStatement,
  useMarkStatementPaid,
  useMyRoyaltyStatements,
  useRoyaltyStatements,
  type RoyaltyStatement,
} from "@/lib/hooks/use-super"
import { useAuthStore } from "@/lib/stores/auth-store"

const lastMonth = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value) || 0)
}

// What each franchise owes the brand each month. Super admins see and settle
// every franchise's; a franchise admin sees their own.
export default function RoyaltiesPage() {
  const { user } = useAuthStore()
  const isSuper = user?.role === "super_admin"
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
    <DashboardPage maxWidth="wide">
      <DashboardHeader title="Royalties" subtitle="The royalty percentage of money received each month, per franchise" />

      {isSuper ? (
        <DashboardPanel>
          <div className="flex flex-wrap items-end gap-2">
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6f76]">Franchise</span>
              <select className="h-10 border border-black/15 bg-white px-3 text-sm" value={franchiseId}
                onChange={(e) => setFranchiseId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">All franchises</option>
                {franchises.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6f76]">Month</span>
              <input type="month" className="h-10 border border-black/15 bg-white px-3 text-sm" value={month}
                onChange={(e) => setMonth(e.target.value || lastMonth())} />
            </label>
            <Button size="sm" disabled={franchiseId === "" || generate.isPending}
              onClick={() => franchiseId !== "" && generate.mutate({ franchiseId, month }, {
                onSuccess: () => toast({ title: "Statement updated", variant: "success" }),
              })}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              Build statement
            </Button>
            <p className="text-xs text-[#5f6268]">Statements for every live franchise are also built automatically on the 1st of each month.</p>
          </div>
        </DashboardPanel>
      ) : null}

      <DashboardPanel padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-[#fbfaf7] text-left text-[11px] uppercase tracking-[0.14em] text-[#6b6f76]">
              <tr>
                {[isSuper ? "Franchise" : null, "Month", "Received", "Refunds", "Royalty", "Status", isSuper ? "" : null]
                  .filter((h) => h !== null)
                  .map((h, i) => <th key={i} className="px-4 py-3 font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/8">
              {statements.length === 0 ? (
                <tr><td className="px-4 py-4 text-[#5f6268]" colSpan={7}>No statements yet.</td></tr>
              ) : (
                statements.map((s: RoyaltyStatement) => (
                  <tr key={s.id}>
                    {isSuper ? <td className="px-4 py-3 font-semibold">{s.franchise_name}</td> : null}
                    <td className="px-4 py-3">{s.period_start.slice(0, 7)}</td>
                    <td className="px-4 py-3">{money(s.gross, s.currency)}</td>
                    <td className="px-4 py-3">{money(s.refunds, s.currency)}</td>
                    <td className="px-4 py-3 font-semibold">{money(s.royalty_due, s.currency)} <span className="text-xs font-normal text-[#5f6268]">({Number(s.royalty_pct)}%)</span></td>
                    <td className="px-4 py-3">{s.status === "paid" ? `Paid${s.paid_at ? ` ${s.paid_at.slice(0, 10)}` : ""}` : "Open"}</td>
                    {isSuper ? (
                      <td className="px-4 py-3">
                        {s.status === "open" ? (
                          <Button size="xs" variant="outline" disabled={markPaid.isPending} onClick={() => markPaid.mutate(s.id)}>Mark paid</Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
    </DashboardPage>
  )
}
