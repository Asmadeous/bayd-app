"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Camera } from "lucide-react"

import { AddressAutocomplete } from "@/components/address-autocomplete"
import { SignupConsent } from "@/components/legal/legal-links"
import api from "@/lib/api"
import { useAuthStore, type AuthUser } from "@/lib/stores/auth-store"

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]

const field =
  "h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm text-[#101217] outline-none focus:border-[#c96c83]"
const label = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

function apiError(e: unknown) {
  const data = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? "Something went wrong. Please try again."
}

// Only sends people back to a page on this site.
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard/customer"
}

// After Google sign-in: Google gives us a name, email and photo, but a booking
// also needs a phone number (appointment texts, the technician calling on
// arrival) and a service address. Collected once, here, before the dashboard.
export function CompleteProfileForm() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get("next"))
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const fileRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState(user?.first_name ?? "")
  const [lastName, setLastName] = useState(user?.last_name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [line1, setLine1] = useState(user?.street_address ?? "")
  const [unit, setUnit] = useState("")
  const [buzzer, setBuzzer] = useState("")
  const [city, setCity] = useState(user?.city ?? "")
  const [province, setProvince] = useState("ON")
  const [postal, setPostal] = useState(user?.postal_code ?? "")
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])

  if (!user || !token) {
    return <p className="text-center text-sm text-[#5f6268]">Please sign in again to finish your account.</p>
  }

  const preview = photoUrl ?? user.avatar_url
  const ready = firstName.trim() && phone.trim() && line1.trim() && city.trim() && postal.trim()

  async function submit() {
    if (!ready || !user || !token) return
    setSaving(true)
    setError(null)
    try {
      await api.post("/addresses", {
        address: {
          label: "Home",
          line1: line1.trim(),
          line2: unit.trim() || undefined,
          is_apartment: !!unit.trim(),
          buzz_code: buzzer.trim() || undefined,
          city: city.trim(),
          province,
          postal_code: postal.trim().toUpperCase(),
          default: true,
        },
      })
      const form = new FormData()
      form.append("user[first_name]", firstName.trim())
      form.append("user[last_name]", lastName.trim())
      form.append("user[phone]", phone.trim())
      form.append("user[street_address]", line1.trim())
      form.append("user[city]", city.trim())
      form.append("user[postal_code]", postal.trim().toUpperCase())
      if (photo) form.append("avatar", photo)
      const { data } = await api.patch<AuthUser>("/auth/me", form, { headers: { "Content-Type": "multipart/form-data" } })
      useAuthStore.getState().setAuth(data, token)
      router.replace(next)
    } catch (e) {
      setError(apiError(e))
      setSaving(false)
    }
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">One last step</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-[#101217]">Finish your account</h1>
      <p className="mt-2 text-sm leading-6 text-[#5f6268]">
        Your technician needs a phone number and the address to come to. You only do this once.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-[#f4f1eb]">
          {preview ? (
            <span aria-hidden className="block size-full bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} />
          ) : (
            <span className="grid size-full place-items-center text-xl font-extrabold text-[#8a8d93]">
              {(firstName[0] ?? user.email[0] ?? "?").toUpperCase()}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-black/15 px-3.5 py-2 text-sm font-semibold text-[#101217]"
        >
          <Camera aria-hidden className="size-4" /> {preview ? "Change photo" : "Add a photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label>
          <span className={label}>First name *</span>
          <input className={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
        </label>
        <label>
          <span className={label}>Last name</span>
          <input className={field} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
        </label>
      </div>

      <label className="mt-4 block">
        <span className={label}>Mobile phone *</span>
        <input
          className={field}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="416 555 0100"
        />
      </label>

      <p className={`${label} mt-6`}>Service address *</p>
      <div className="space-y-3">
        <AddressAutocomplete
          className={field}
          value={line1}
          onChange={setLine1}
          onResolved={(addr) => {
            if (addr.city) setCity(addr.city)
            if (addr.province) setProvince(addr.province)
            if (addr.postal_code) setPostal(addr.postal_code)
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={field} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit / apartment (optional)" />
          <input className={field} value={buzzer} onChange={(e) => setBuzzer(e.target.value)} placeholder="Buzzer code (optional)" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={field} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" />
          <select className={field} value={province} onChange={(e) => setProvince(e.target.value)} aria-label="Province">
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input className={field} value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="Postal code *" />
        </div>
      </div>

      {error ? (
        <p aria-live="polite" className="mt-5 rounded-xl bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!ready || saving}
        onClick={submit}
        className="mt-6 h-12 w-full rounded-xl bg-[#101217] text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Continue"}
      </button>
      <SignupConsent className="mt-4 text-[#8a8d93]" linkClassName="text-[#9E4A60]" />
    </div>
  )
}
