"use client"

import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { useAdminPartners } from "@/lib/hooks/use-partners"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, eyebrowClass, mutedClass } from "../admin-theme"
import { EmptyCard } from "../ui"

// The web Partners page: partner businesses with what each is owed now. Each
// opens its partner screen (providers, settle, payouts, edit, delete).
export default function AdminPartnersScreen() {
  const { data, isLoading } = useAdminPartners()
  const partners = data?.data ?? []

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Partners"
        action={
          <Link href="/admin/partners/edit" className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> Add
          </Link>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Partner businesses supplying providers to the B.A.Y.D pool.</p>

      <div className="space-y-3 px-5">
        <section className={`${cardClass} space-y-2 p-5`}>
          <p className={eyebrowClass}>Payout model</p>
          <p className={`text-sm leading-6 ${mutedClass}`}>
            Partners supply technicians and coverage; B.A.Y.D collects payment and holds funds. Each partner earns their share of completed
            bookings after the platform fee. Settle owed amounts into a payout, then mark it paid once funds are sent.
          </p>
          <p className={`text-sm leading-6 ${mutedClass}`}>
            Creating a partner also creates a provider login and a bookable provider profile. That provider is <strong>dormant</strong> until you
            set its coverage areas and services under <strong>Employees</strong>.
          </p>
        </section>

        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading partners…</p>
        ) : partners.length === 0 ? (
          <EmptyCard title="No partners yet" body="Add partner businesses that supply providers to the B.A.Y.D pool." />
        ) : (
          partners.map((p) => (
            <Link key={p.id} href={`/admin/partners/view?id=${p.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold">{p.name}</span>
                  <StatusBadgeFor status={p.status} />
                </div>
                <p className={`mt-1 text-sm ${mutedClass}`}>
                  {p.providers_count} provider{p.providers_count === 1 ? "" : "s"} · {p.covered_fsas.length} FSA · {Number(p.platform_fee_pct)}% fee
                </p>
                <p className="mt-1 text-sm">
                  <span className={mutedClass}>Owed now: </span>
                  <span className="font-bold text-[#C96C83]">{formatMoney(Number(p.pending.owed))}</span>
                  <span className={mutedClass}>
                    {" "}
                    ({p.pending.booking_count} booking{p.pending.booking_count === 1 ? "" : "s"})
                  </span>
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-[#14100F]/30" aria-hidden />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
