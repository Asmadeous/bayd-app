"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { FranchiseSetupForm } from "@/components/dashboard/franchise-setup-form"
import { useCreateFranchise } from "@/lib/hooks/use-super"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../../admin-theme"
import { SuperGate } from "../../super-gate"
import { apiError } from "../../ui"

export default function AdminNewFranchiseScreen() {
  return (
    <SuperGate title="New franchise">
      <NewFranchise />
    </SuperGate>
  )
}

// The web New franchise page: the same setup form; it starts as a draft.
function NewFranchise() {
  const router = useRouter()
  const create = useCreateFranchise()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="New franchise" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>It starts as a draft, hidden from customers, until you take it live.</p>
      <div className="px-5">
        <section className={`${cardClass} p-4`}>
          <FranchiseSetupForm
            saving={create.isPending}
            submitLabel="Create franchise"
            error={error}
            onSubmit={(input) =>
              create.mutate(input, {
                onSuccess: (f) => router.replace(`/admin/franchises/view?id=${f.id}`),
                onError: (e) => setError(apiError(e, "Couldn't create the franchise.")),
              })
            }
          />
        </section>
      </div>
    </div>
  )
}
