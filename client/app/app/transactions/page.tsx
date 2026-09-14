"use client"

import { useInvoices } from "@/lib/hooks/use-invoices"
import { cardClass, mutedClass } from "../app-theme"
import { SectionScreen } from "../section-screen"

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-[#c96c83]/12 text-[#c96c83]",
  issued: "bg-black/8 text-[#101217]/60",
  void: "bg-[#8f3f4b]/12 text-[#8f3f4b]",
  refunded: "bg-[#8f3f4b]/12 text-[#8f3f4b]",
}

export default function AppTransactionsScreen() {
  const { data, isLoading } = useInvoices(1)
  const invoices = data?.data ?? []

  return (
    <SectionScreen title="Transactions">
      {isLoading ? (
        <ListSkeleton />
      ) : invoices.length === 0 ? (
        <Empty text="No transactions yet." />
      ) : (
        <ul className="space-y-3 pb-6">
          {invoices.map((inv) => {
            const when = new Date(inv.issued_at ?? inv.created_at)
            return (
              <li key={inv.id} className={`p-4 ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] ${
                      STATUS_STYLE[inv.status] ?? "bg-black/8 text-[#101217]/60"
                    }`}
                  >
                    {inv.status}
                  </span>
                  <span className="text-sm font-extrabold">${Number(inv.total).toFixed(2)}</span>
                </div>
                <p className="mt-2 text-sm font-bold">{inv.source_label}</p>
                <p className={`mt-0.5 text-xs ${mutedClass}`}>
                  {inv.invoice_number} · {when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </SectionScreen>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-3xl bg-black/[0.04]" />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className={`rounded-3xl bg-white p-8 text-center text-sm shadow-sm ${mutedClass}`}>{text}</p>
}
