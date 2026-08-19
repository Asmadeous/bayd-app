"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MapPin, Plus } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { customerAddressesSteps } from "@/lib/tours/customer-addresses-tour"

interface Address {
  id: number
  label: string | null
  line1: string
  line2: string | null
  city: string
  province: string
  postal_code: string
  is_default: boolean
}

const blankAddress = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  province: "ON",
  postal_code: "",
}

const fieldClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass = "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"
type AddressField = keyof typeof blankAddress
type AddressErrors = Partial<Record<AddressField | "base", string>>

export default function CustomerAddressesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(blankAddress)
  const [errors, setErrors] = useState<AddressErrors>({})

  const { data: addresses = [], isError, isLoading } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => api.get<Address[]>("/addresses").then((response) => response.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post<Address>("/addresses", { address: form }).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] })
      setAdding(false)
      setForm(blankAddress)
      setErrors({})
      toast({ title: "Address saved", variant: "success" })
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Could not save this address.")
      setErrors({ base: message })
      toast({ title: "Address not saved", description: message, variant: "error" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] })
      toast({ title: "Address removed", variant: "success" })
    },
    onError: (error: unknown) => toast({
      title: "Address not removed",
      description: getApiErrorMessage(error, "Could not remove this address."),
      variant: "error",
    }),
  })

  const defaultMutation = useMutation({
    mutationFn: (id: number) => api.post(`/addresses/${id}/set_default`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] })
      toast({ title: "Default address updated", variant: "success" })
    },
    onError: (error: unknown) => toast({
      title: "Default address not updated",
      description: getApiErrorMessage(error, "Could not set this address as default."),
      variant: "error",
    }),
  })

  useEffect(() => {
    if (isError) {
      toast({
        title: "Addresses not loaded",
        description: "Could not load your saved addresses.",
        variant: "error",
      })
    }
  }, [isError, toast])

  function updateField(field: AddressField, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field] && !current.base) return current
      const next = { ...current }
      delete next[field]
      delete next.base
      return next
    })
  }

  function saveAddress() {
    const nextErrors = validateAddress(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast({
        title: "Address needs attention",
        description: "Check the highlighted fields and try again.",
        variant: "error",
      })
      return
    }

    createMutation.mutate()
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="customer-addresses-header">
        <DashboardHeader
          actions={
            <Button
              data-tour="customer-addresses-add"
              onClick={() => setAdding((value) => !value)}
              size="sm"
              style={adding ? undefined : { background: "#c96c83", border: "none", color: "#fff" }}
              variant={adding ? "outline" : "default"}
            >
              {!adding ? <Plus aria-hidden="true" className="size-4" /> : null}
              {adding ? "Cancel" : "Add Address"}
            </Button>
          }
          title="Addresses"
          subtitle="Manage service locations for mobile beauty appointments."
        />
      </div>

      {adding ? (
        <DashboardPanel data-tour="customer-addresses-form">
          {errors.base ? (
            <div
              aria-live="polite"
              className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
            >
              {errors.base}
            </div>
          ) : null}
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Service location
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-[#101217]">New Address</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["label", "line1", "line2", "city", "province", "postal_code"] as const).map((field) => (
              <div className={field === "line1" ? "sm:col-span-2" : ""} key={field}>
                <label className={labelClass}>{field.replace("_", " ")}</label>
                <input
                  aria-invalid={Boolean(errors[field])}
                  className={`${fieldClass} ${errors[field] ? errorInputClass : ""}`}
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                />
                {errors[field] ? (
                  <p className="mt-1 text-xs font-semibold text-[#b75c68]">{errors[field]}</p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Button
              disabled={createMutation.isPending}
              onClick={saveAddress}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              Save Address
            </Button>
          </div>
        </DashboardPanel>
      ) : null}

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading addresses...</p>
        </DashboardPanel>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses yet"
          description="Add a service address to make checkout and booking faster."
        />
      ) : (
        <div className="space-y-3" data-tour="customer-addresses-list">
          {addresses.map((address) => (
            <DashboardPanel className="p-0" key={address.id}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold text-[#101217]">
                      {address.label ?? address.line1}
                    </h2>
                    {address.is_default ? <StatusBadgeFor status="default" /> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f6268]">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                    {address.province} {address.postal_code}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {!address.is_default ? (
                  <Button
                      disabled={defaultMutation.isPending}
                      onClick={() => defaultMutation.mutate(address.id)}
                      size="xs"
                      variant="outline"
                    >
                      Set Default
                    </Button>
                  ) : null}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={deleteMutation.isPending}
                        size="xs"
                        variant="destructive"
                      >
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove address?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes {address.label ?? address.line1} from your saved service locations.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(address.id)}>
                          Remove address
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}

      <TutorialButton steps={customerAddressesSteps} pageKey="customer-addresses" />
    </DashboardPage>
  )
}

function validateAddress(form: typeof blankAddress) {
  const errors: AddressErrors = {}
  if (!form.line1.trim()) errors.line1 = "Street address is required."
  if (!form.city.trim()) errors.city = "City is required."
  if (!form.province.trim()) errors.province = "Province is required."
  if (!form.postal_code.trim()) errors.postal_code = "Postal code is required."
  return errors
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
