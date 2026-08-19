"use client"

import { useQuery } from "@tanstack/react-query"

import { BookingFlow, type SavedAddress } from "@/app/book/page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import api from "@/lib/api"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function CustomerBookPage() {
  const { isAuthenticated } = useAuthStore()
  const { data: addresses = [], isLoading } = useQuery<SavedAddress[]>({
    queryKey: ["addresses"],
    queryFn: () => api.get<SavedAddress[]>("/addresses").then((response) => response.data),
    enabled: isAuthenticated,
  })
  const initialAddress = addresses.find((address) => address.default || address.is_default) ?? addresses[0] ?? null

  if (isLoading) {
    return (
      <DashboardPanel>
        <p className="text-sm text-[#5f6268]">Preparing booking form...</p>
      </DashboardPanel>
    )
  }

  return <BookingFlow dashboardMode initialAddress={initialAddress} />
}
