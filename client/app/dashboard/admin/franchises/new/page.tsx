"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { FranchiseSetupForm } from "@/components/dashboard/franchise-setup-form"
import { SuperOnly } from "@/components/dashboard/super-only"
import { useCreateFranchise } from "@/lib/hooks/use-super"

export default function NewFranchisePage() {
  const router = useRouter()
  const create = useCreateFranchise()
  const [error, setError] = useState<string | null>(null)

  return (
    <DashboardPage>
      <DashboardHeader title="New franchise" subtitle="It starts as a draft, hidden from customers, until you take it live" />
      <SuperOnly>
        <FranchiseSetupForm
          saving={create.isPending}
          submitLabel="Create franchise"
          error={error}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (f) => router.push(`/dashboard/admin/franchises/view?id=${f.id}`),
              onError: (err: unknown) => {
                const data = (err as { response?: { data?: { errors?: string[]; error?: string } } })?.response?.data
                setError(data?.errors?.join(", ") ?? data?.error ?? "Couldn't create the franchise.")
              },
            })
          }
        />
      </SuperOnly>
    </DashboardPage>
  )
}
