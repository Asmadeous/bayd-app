"use client"

import { useServiceAreaCoverage } from "@/lib/hooks/use-admin"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { EmptyCard } from "../ui"

// The web Service Areas page: the real coverage, read from each technician's
// postal-prefix (FSA) list.
export default function AdminServiceAreasScreen() {
  const { data, isLoading } = useServiceAreaCoverage()
  const fsas = Object.entries(data?.fsas ?? {})
  const techNames = new Set(fsas.flatMap(([, techs]) => techs.map((t) => t.name ?? `#${t.employee_profile_id}`)))

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Service areas" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>
        Real coverage, read from each technician&apos;s postal-code (FSA) list. This is what decides if a booking can be accepted.
      </p>
      <div className="space-y-3 px-5">
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading coverage…</p>
        ) : !data?.configured ? (
          <EmptyCard
            title="No coverage configured yet"
            body="No technician has any FSAs set on their profile. Until one does, every address is treated as covered. Set FSAs on a tech's profile under Employees to restrict coverage to real zones."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(cardClass, "bg-[#14100F] p-4 text-white")}>
                <p className="text-xs font-bold uppercase tracking-wide text-white/70">FSAs covered</p>
                <p className="mt-1 text-2xl font-black">{fsas.length}</p>
              </div>
              <div className={`${cardClass} p-4`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${mutedClass}`}>Techs with coverage</p>
                <p className="mt-1 text-2xl font-black">{techNames.size}</p>
              </div>
            </div>
            {fsas.map(([fsa, techs]) => (
              <section key={fsa} className={`${cardClass} flex items-start justify-between gap-3 p-4`}>
                <span className="font-mono text-base font-bold">{fsa}</span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {techs.map((t) => (
                    <span key={t.employee_profile_id} className="rounded-full bg-[#C96C83]/10 px-2.5 py-1 text-xs font-bold text-[#C96C83]">
                      {t.name ?? `#${t.employee_profile_id}`}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
