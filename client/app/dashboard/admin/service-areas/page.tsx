"use client"

import { MapPin, Users } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { MetricCard } from "@/components/dashboard/metric-card"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { useServiceAreaCoverage } from "@/lib/hooks/use-admin"
import { adminServiceAreasSteps } from "@/lib/tours/admin-service-areas-tour"

export default function AdminServiceAreasPage() {
  const { data, isLoading } = useServiceAreaCoverage()
  const fsas = Object.entries(data?.fsas ?? {})
  const techNames = new Set(fsas.flatMap(([, techs]) => techs.map((t) => t.name ?? `#${t.employee_profile_id}`)))

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-service-areas-header">
        <DashboardHeader
          title="Service Areas"
          subtitle="Real coverage, read from each technician's postal-code (FSA) list - this is what actually decides if a booking can be accepted."
        />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading coverage...</p>
        </DashboardPanel>
      ) : !data?.configured ? (
        <EmptyState
          icon={MapPin}
          title="No coverage configured yet"
          description="No technician has any FSAs set on their profile - until one does, every address is treated as covered. Set FSAs on a tech's profile (Dashboard -> Employees) to restrict coverage to real zones."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2" data-tour="admin-service-areas-metrics">
            <MetricCard accent icon={MapPin} label="FSAs Covered" value={fsas.length} />
            <MetricCard icon={Users} label="Technicians With Coverage" value={techNames.size} />
          </div>

          <div className="space-y-3" data-tour="admin-service-areas-list">
            {fsas.map(([fsa, techs]) => (
              <DashboardPanel key={fsa} className="flex items-center justify-between gap-4">
                <span className="text-sm font-extrabold text-[#101217]">{fsa}</span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {techs.map((t) => (
                    <span
                      key={t.employee_profile_id}
                      className="inline-flex items-center bg-[#c96c83]/10 px-2.5 py-1 text-xs font-bold text-[#c96c83]"
                    >
                      {t.name ?? `#${t.employee_profile_id}`}
                    </span>
                  ))}
                </div>
              </DashboardPanel>
            ))}
          </div>
        </>
      )}

      <TutorialButton steps={adminServiceAreasSteps} pageKey="admin-service-areas" />
    </DashboardPage>
  )
}
