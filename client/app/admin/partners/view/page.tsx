"use client"

import Link from "next/link"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { PartnerDetail } from "@/components/dashboard/partner-detail"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { useDeletePartner, usePartnerDetail } from "@/lib/hooks/use-partners"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, displayClass, mutedClass } from "../../admin-theme"
import { apiError } from "../../ui"

export default function AdminPartnerScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <PartnerScreen />
    </Suspense>
  )
}

function PartnerScreen() {
  const id = Number(useSearchParams().get("id"))
  const router = useRouter()
  const { toast } = useToast()
  const confirm = useConfirm()
  const { data, isLoading } = usePartnerDetail(id > 0 ? id : null)
  const del = useDeletePartner()
  const p = data?.partner

  if (isLoading || !p) {
    return (
      <div className={adminScreenClass}>
        <AdminHeader back title="Partner" />
        <p className={`px-5 text-sm ${mutedClass}`}>{isLoading ? "Loading…" : "Partner not found."}</p>
      </div>
    )
  }

  async function remove() {
    if (!p) return
    const ok = await confirm({
      title: "Delete partner?",
      message: `This removes ${p.name}. Assigned providers and bookings stay in the system, but they will be unlinked from this partner.`,
      confirmLabel: "Delete partner",
      tone: "danger",
    })
    if (!ok) return
    del.mutate(p.id, {
      onSuccess: () => {
        toast({ title: "Partner deleted", description: `${p.name} was removed.`, variant: "success" })
        router.back()
      },
      onError: (e) => toast({ title: "Partner not deleted", description: apiError(e, "Could not delete this partner."), variant: "error" }),
    })
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="Partner" />
      <div className="space-y-4 px-5">
        <section className={`${cardClass} p-5`}>
          <div className="flex flex-wrap items-center gap-2">
            <p className={`${displayClass} text-2xl`}>{p.name}</p>
            <StatusBadgeFor status={p.status} />
          </div>
          {p.email ? <p className="mt-2 break-all text-sm">{p.email}</p> : null}
          {p.phone ? (
            <a href={`tel:${p.phone}`} className="text-sm font-semibold text-[#C96C83]">
              {p.phone}
            </a>
          ) : null}
          <p className={`mt-2 text-sm ${mutedClass}`}>
            {p.providers_count} provider{p.providers_count === 1 ? "" : "s"} · {p.covered_fsas.length} FSA · {Number(p.platform_fee_pct)}% platform fee
          </p>
          <p className="mt-1 text-sm">
            <span className={mutedClass}>Owed now: </span>
            <span className="font-bold text-[#C96C83]">{formatMoney(Number(p.pending.owed))}</span>
            <span className={mutedClass}> (gross {formatMoney(Number(p.pending.gross))})</span>
          </p>
          {p.payout_notes ? <p className={`mt-1 text-sm ${mutedClass}`}>Payout notes: {p.payout_notes}</p> : null}
          <div className="mt-4 flex gap-2">
            <Link href={`/admin/partners/edit?id=${p.id}`} className="grid h-10 place-items-center rounded-xl border border-black/10 bg-white px-4 text-sm font-bold">
              Edit
            </Link>
            <button
              type="button"
              disabled={del.isPending}
              onClick={remove}
              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#8f3f4b] disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </section>

        <section className={`${cardClass} px-5 pb-5 pt-1`}>
          <PartnerDetail partnerId={p.id} owed={p.pending.owed} pendingCount={p.pending.booking_count} />
        </section>
      </div>
    </div>
  )
}
