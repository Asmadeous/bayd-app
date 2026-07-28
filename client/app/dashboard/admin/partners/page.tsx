"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import {
  useAdminPartners,
  usePartnerDetail,
  useCreatePartner,
  useUpdatePartner,
  useDeletePartner,
  useSettlePartner,
  useMarkPayoutPaid,
  type Partner,
  type PartnerInput,
} from "@/lib/hooks/use-partners"

const cad = (v: string | number) => `$${Number(v).toFixed(2)}`
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "—")
const BLANK: PartnerInput = { name: "", email: "", phone: "", platform_fee_pct: "20", status: "active", payout_notes: "" }

export default function AdminPartnersPage() {
  const { data, isLoading } = useAdminPartners()
  const create = useCreatePartner()
  const update = useUpdatePartner()
  const del = useDeletePartner()

  const [form, setForm] = useState<PartnerInput | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const partners = data?.data ?? []

  function startCreate() { setForm(BLANK); setEditingId(null) }
  function startEdit(p: Partner) {
    setForm({ name: p.name, email: p.email ?? "", phone: p.phone ?? "", platform_fee_pct: p.platform_fee_pct, status: p.status, payout_notes: p.payout_notes ?? "" })
    setEditingId(p.id)
  }
  async function save() {
    if (!form) return
    if (editingId) await update.mutateAsync({ id: editingId, ...form })
    else await create.mutateAsync(form)
    setForm(null); setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Partners"
        subtitle="Partner businesses supplying providers to the B.A.Y.D pool"
        actions={<Button size="sm" onClick={startCreate} style={{ background: "#c96c83", border: "none", color: "#fff" }}>+ Add Partner</Button>}
      />

      <p className="rounded-xl border border-black/8 bg-white px-4 py-3 text-xs text-[#5f6268]">
        Partners supply technicians and coverage; B.A.Y.D collects payment and holds funds. Each partner earns their share
        (100% − platform fee) of the bookings their providers complete. Settle owed amounts into a payout, then mark it paid
        once you&apos;ve sent the funds.
      </p>

      {form && (
        <div className="rounded-xl border border-black/8 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-sm text-[#101217]">{editingId ? "Edit Partner" : "New Partner"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f!, name: e.target.value }))} className={inputCls} /></Field>
            <Field label="Platform fee (%)"><input type="number" min="0" max="100" step="0.5" value={form.platform_fee_pct ?? ""} onChange={(e) => setForm((f) => ({ ...f!, platform_fee_pct: e.target.value }))} className={inputCls} /></Field>
            <Field label="Email"><input type="email" value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f!, email: e.target.value }))} className={inputCls} /></Field>
            <Field label="Phone"><input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f!, phone: e.target.value }))} className={inputCls} /></Field>
            <Field label="Status">
              <select value={form.status ?? "active"} onChange={(e) => setForm((f) => ({ ...f!, status: e.target.value as Partner["status"] }))} className={inputCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
          <Field label="Payout notes"><input value={form.payout_notes ?? ""} onChange={(e) => setForm((f) => ({ ...f!, payout_notes: e.target.value }))} placeholder="e-transfer email, bank ref…" className={inputCls} /></Field>
          <div className="flex gap-2">
            <Button size="sm" disabled={!form.name || create.isPending || update.isPending} onClick={save} style={{ background: "#c96c83", border: "none", color: "#fff" }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setForm(null); setEditingId(null) }}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : partners.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No partners yet.</div>
      ) : (
        <div className="space-y-3">
          {partners.map((p) => (
            <div key={p.id} className="rounded-xl border border-black/8 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#101217]">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                      style={p.status === "active" ? { background: "#5a9e5a22", color: "#5a9e5a" } : { background: "#8a8d9322", color: "#8a8d93" }}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#5f6268] mt-0.5">
                    {p.providers_count} provider{p.providers_count === 1 ? "" : "s"} · {p.covered_fsas.length} FSA · {Number(p.platform_fee_pct)}% platform fee
                  </p>
                  <p className="text-xs mt-1">
                    <span className="text-[#5f6268]">Owed now: </span>
                    <span className="font-semibold text-[#c96c83]">{cad(p.pending.owed)}</span>
                    <span className="text-[#8a8d93]"> ({p.pending.booking_count} booking{p.pending.booking_count === 1 ? "" : "s"}, gross {cad(p.pending.gross)})</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="xs" variant="outline" onClick={() => setOpenId(openId === p.id ? null : p.id)}>{openId === p.id ? "Hide" : "Details"}</Button>
                  <Button size="xs" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                  <Button size="xs" variant="outline" onClick={() => { if (confirm(`Delete ${p.name}? Their providers stay, just unlinked.`)) del.mutate(p.id) }}>
                    <Trash2 className="size-3.5 text-[#d4754a]" />
                  </Button>
                </div>
              </div>

              {openId === p.id && <PartnerDetail partnerId={p.id} owed={p.pending.owed} pendingCount={p.pending.booking_count} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PartnerDetail({ partnerId, owed, pendingCount }: { partnerId: number; owed: string; pendingCount: number }) {
  const { data, isLoading } = usePartnerDetail(partnerId)
  const settle = useSettlePartner()
  const markPaid = useMarkPayoutPaid()

  if (isLoading || !data) return <div className="mt-3 text-xs text-[#5f6268]">Loading…</div>

  return (
    <div className="mt-3 border-t border-black/8 pt-3 space-y-4">
      {/* Providers */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[#8a8d93] mb-1.5">Providers</p>
        {data.providers.length === 0 ? (
          <p className="text-xs text-[#8a8d93]">None assigned. Set a provider&apos;s partner on the Employees page.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.providers.map((ep) => (
              <span key={ep.id} className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 text-[#101217]">
                {[ep.user?.first_name, ep.user?.last_name].filter(Boolean).join(" ")} · {ep.service_fsas.length} FSA
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Settle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#5f6268]">Owed now: <span className="font-semibold text-[#c96c83]">{cad(owed)}</span></p>
        <Button size="xs" disabled={pendingCount === 0 || settle.isPending} onClick={() => settle.mutate(partnerId)}
          style={{ background: pendingCount === 0 ? "#e5e5e5" : "#101217", border: "none", color: "#fff" }}>
          {settle.isPending ? "Settling…" : `Create payout${pendingCount ? ` (${cad(owed)})` : ""}`}
        </Button>
      </div>

      {/* Payout history */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[#8a8d93] mb-1.5">Payout history</p>
        {data.payouts.length === 0 ? (
          <p className="text-xs text-[#8a8d93]">No payouts yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.payouts.map((po) => (
              <div key={po.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[#5f6268]">
                  {dt(po.created_at)} · {po.booking_count} bookings · gross {cad(po.gross)} − fee {cad(po.fee_amount)} ={" "}
                  <span className="font-semibold text-[#101217]">{cad(po.amount)}</span>
                </span>
                {po.status === "paid" ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#5a9e5a22", color: "#5a9e5a" }}>
                    Paid {dt(po.paid_at)}
                  </span>
                ) : (
                  <Button size="xs" variant="outline" disabled={markPaid.isPending} onClick={() => markPaid.mutate({ id: po.id })}>Mark paid</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls =
  "w-full h-9 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#5f6268] mb-1">{label}</label>
      {children}
    </div>
  )
}
