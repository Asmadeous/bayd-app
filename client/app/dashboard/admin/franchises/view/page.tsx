"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check, ChevronLeft, X } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { FranchiseSetupForm } from "@/components/dashboard/franchise-setup-form"
import { SuperOnly } from "@/components/dashboard/super-only"
import { Button } from "@/components/ui/button"
import {
  SQUARE_KEYS,
  useCopyCatalog,
  useFranchise,
  useFranchises,
  useFranchiseStatus,
  useInviteAdmin,
  useRemoveAdmin,
  useSaveSquareKeys,
  useTestPayments,
  useUpdateFranchise,
  type Franchise,
} from "@/lib/hooks/use-super"

const field = "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none focus:border-[#c96c83]"
const lbl = "mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

const READINESS: { key: keyof Franchise["readiness"]; label: string; hint: string }[] = [
  { key: "admin", label: "An admin to run it", hint: "Invite one below." },
  { key: "payments", label: "Square keys", hint: "Add the access token and location ID below." },
  { key: "services", label: "Services on the menu", hint: "Copy the catalog below, then set local prices." },
  { key: "technicians", label: "At least one technician", hint: "The franchise admin adds staff." },
  { key: "legal", label: "Privacy policy and terms", hint: "Write them below (legal review first)." },
]

const KEY_LABELS: Record<(typeof SQUARE_KEYS)[number], string> = {
  access_token: "Access token",
  location_id: "Location ID",
  application_id: "Application ID",
  environment: "Environment",
  webhook_signature_key: "Webhook signature key",
}

function apiError(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}

export default function FranchiseDetailPage() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <FranchiseDetail />
    </Suspense>
  )
}

function FranchiseDetail() {
  const id = Number(useSearchParams().get("id"))
  const { data: franchise, isLoading } = useFranchise(id)

  return (
    <DashboardPage>
      <Link href="/dashboard/admin/franchises" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5f6268] hover:text-[#101217]">
        <ChevronLeft aria-hidden className="size-4" /> All franchises
      </Link>
      <SuperOnly>
        {isLoading || !franchise ? (
          <DashboardPanel><p className="text-sm text-[#5f6268]">{isLoading ? "Loading…" : "Franchise not found."}</p></DashboardPanel>
        ) : (
          <FranchiseSections franchise={franchise} />
        )}
      </SuperOnly>
    </DashboardPage>
  )
}

function FranchiseSections({ franchise }: { franchise: Franchise }) {
  const { toast } = useToast()
  const status = useFranchiseStatus(franchise.id)
  const update = useUpdateFranchise(franchise.id)
  const [setupError, setSetupError] = useState<string | null>(null)
  const ready = Object.values(franchise.readiness).every(Boolean)

  function changeStatus(action: "go_live" | "suspend") {
    status.mutate(action, {
      onSuccess: () => toast({ title: action === "go_live" ? "Franchise is live" : "Franchise suspended", variant: "success" }),
      onError: (err) => toast({ title: "Not changed", description: apiError(err, "Please try again."), variant: "error" }),
    })
  }

  return (
    <>
      <DashboardHeader
        title={franchise.name}
        subtitle={`${franchise.status === "live" ? "Live" : franchise.status === "draft" ? "Draft, hidden from customers" : "Suspended"} · ${franchise.currency} · ${franchise.time_zone.replace(/_/g, " ")}`}
        actions={
          franchise.status === "live" ? (
            franchise.is_default ? null : (
              <Button size="sm" variant="outline" disabled={status.isPending} onClick={() => changeStatus("suspend")}>Suspend</Button>
            )
          ) : (
            <Button size="sm" disabled={status.isPending || !ready} onClick={() => changeStatus("go_live")}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              Go live
            </Button>
          )
        }
      />

      <DashboardPanel>
        <h2 className="text-base font-extrabold">Ready to take bookings?</h2>
        <ul className="mt-3 space-y-2">
          {READINESS.map((r) => (
            <li key={r.key} className="flex items-start gap-2 text-sm">
              {franchise.readiness[r.key] ? (
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[#3f7e47]" />
              ) : (
                <X aria-hidden className="mt-0.5 size-4 shrink-0 text-[#b75c68]" />
              )}
              <span>
                <span className="font-semibold text-[#101217]">{r.label}</span>
                {franchise.readiness[r.key] ? null : <span className="text-[#5f6268]"> · {r.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
      </DashboardPanel>

      <DashboardPanel>
        <h2 className="mb-4 text-base font-extrabold">Setup</h2>
        <FranchiseSetupForm
          key={franchise.id}
          franchise={franchise}
          saving={update.isPending}
          submitLabel="Save setup"
          error={setupError}
          onSubmit={(input) =>
            update.mutate(input, {
              onSuccess: () => { setSetupError(null); toast({ title: "Setup saved", variant: "success" }) },
              onError: (err) => setSetupError(apiError(err, "Couldn't save the setup.")),
            })
          }
        />
      </DashboardPanel>

      <PaymentsSection franchise={franchise} />
      <CatalogSection franchise={franchise} />
      <AdminsSection franchise={franchise} />
      <LegalSection franchise={franchise} />
    </>
  )
}

function PaymentsSection({ franchise }: { franchise: Franchise }) {
  const { toast } = useToast()
  const save = useSaveSquareKeys(franchise.id)
  const test = useTestPayments(franchise.id)
  const [values, setValues] = useState<Partial<Record<(typeof SQUARE_KEYS)[number], string>>>({})
  const stored = franchise.credential_status.square

  function submit(e: React.FormEvent) {
    e.preventDefault()
    save.mutate(values, {
      onSuccess: () => { setValues({}); toast({ title: "Square keys saved", variant: "success" }) },
      onError: (err) => toast({ title: "Keys not saved", description: apiError(err, "Please try again."), variant: "error" }),
    })
  }

  return (
    <DashboardPanel>
      <h2 className="text-base font-extrabold">Payments (Square)</h2>
      <p className="mt-1 text-sm text-[#5f6268]">
        This franchise&apos;s own Square account. Keys are stored encrypted and never shown again; leave a box empty to keep what&apos;s stored.
        {franchise.is_default ? " Until keys are entered here, the default franchise uses the server's keys." : ""}
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        {SQUARE_KEYS.map((key) => (
          <label key={key} className="block">
            <span className={lbl}>
              {KEY_LABELS[key]} · <span className={stored[key] ? "text-[#3f7e47]" : "text-[#b75c68]"}>{stored[key] ? "stored" : "missing"}</span>
            </span>
            {key === "environment" ? (
              <select className={field} value={values.environment ?? ""} onChange={(e) => setValues((v) => ({ ...v, environment: e.target.value }))}>
                <option value="">Keep current</option>
                <option value="production">Production (real payments)</option>
                <option value="sandbox">Sandbox (testing)</option>
              </select>
            ) : (
              <input
                className={field}
                type={key === "access_token" || key === "webhook_signature_key" ? "password" : "text"}
                autoComplete="off"
                value={values[key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            )}
          </label>
        ))}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={save.isPending} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
            {save.isPending ? "Saving…" : "Save keys"}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={test.isPending}
            onClick={() => test.mutate(undefined, {
              onSuccess: (r) => toast({ title: r.ok ? "Connected" : "Not connected", description: r.message, variant: r.ok ? "success" : "error" }),
            })}>
            {test.isPending ? "Testing…" : "Test connection"}
          </Button>
        </div>
      </form>
      <p className="mt-4 text-xs text-[#5f6268]">
        In Square, set this franchise&apos;s payment webhook to <code className="break-all font-mono text-[#101217]">{franchise.webhook_urls.square}</code>
      </p>
    </DashboardPanel>
  )
}

function CatalogSection({ franchise }: { franchise: Franchise }) {
  const { toast } = useToast()
  const { data: all = [] } = useFranchises()
  const copy = useCopyCatalog(franchise.id)
  const sources = all.filter((f) => f.id !== franchise.id)
  const [from, setFrom] = useState<number | "">("")

  return (
    <DashboardPanel>
      <h2 className="text-base font-extrabold">Service menu</h2>
      <p className="mt-1 text-sm text-[#5f6268]">
        Copy another franchise&apos;s categories and services (with prices and photos) as a start. Anything already here is kept, so it&apos;s safe to run again. The franchise admin then sets local prices.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-56">
          <span className={lbl}>Copy from</span>
          <select className={field} value={from} onChange={(e) => setFrom(e.target.value ? Number(e.target.value) : "")}>
            <option value="">The default franchise</option>
            {sources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <Button size="sm" variant="outline" disabled={copy.isPending || sources.length === 0}
          onClick={() => copy.mutate(from === "" ? undefined : from, {
            onSuccess: (r) => toast({ title: `${r.copied} service${r.copied === 1 ? "" : "s"} copied`, variant: "success" }),
            onError: (err) => toast({ title: "Not copied", description: apiError(err, "Please try again."), variant: "error" }),
          })}>
          {copy.isPending ? "Copying…" : "Copy services"}
        </Button>
      </div>
    </DashboardPanel>
  )
}

function AdminsSection({ franchise }: { franchise: Franchise }) {
  const { toast } = useToast()
  const invite = useInviteAdmin(franchise.id)
  const remove = useRemoveAdmin(franchise.id)
  const [firstName, setFirstName] = useState("")
  const [email, setEmail] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    invite.mutate({ email: email.trim(), first_name: firstName.trim() }, {
      onSuccess: () => {
        setEmail("")
        setFirstName("")
        toast({ title: "Invite sent", description: "They'll get an email to choose their password.", variant: "success" })
      },
      onError: (err) => toast({ title: "Not invited", description: apiError(err, "Please try again."), variant: "error" }),
    })
  }

  return (
    <DashboardPanel>
      <h2 className="text-base font-extrabold">Franchise admins</h2>
      <p className="mt-1 text-sm text-[#5f6268]">They run this franchise only: its staff, services, bookings and settings.</p>
      {franchise.admins.length ? (
        <ul className="mt-3 divide-y divide-black/8 border border-black/8">
          {franchise.admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 bg-white px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-semibold">{[a.first_name, a.last_name].filter(Boolean).join(" ") || a.email}</span>
                <span className="text-[#5f6268]"> · {a.email}</span>
              </span>
              <Button size="xs" variant="ghost" disabled={remove.isPending}
                onClick={() => remove.mutate(a.id, {
                  onSuccess: () => toast({ title: "Admin access removed", variant: "success" }),
                })}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#5f6268]">No admins yet.</p>
      )}
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label><span className={lbl}>First name</span><input className={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></label>
        <label><span className={lbl}>Email</span><input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <Button type="submit" size="sm" disabled={invite.isPending} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {invite.isPending ? "Inviting…" : "Invite admin"}
        </Button>
      </form>
    </DashboardPanel>
  )
}

function LegalSection({ franchise }: { franchise: Franchise }) {
  const { toast } = useToast()
  const update = useUpdateFranchise(franchise.id)
  const [privacy, setPrivacy] = useState(franchise.privacy_body ?? "")
  const [terms, setTerms] = useState(franchise.terms_body ?? "")
  const area = "min-h-48 w-full border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none focus:border-[#c96c83]"

  return (
    <DashboardPanel>
      <h2 className="text-base font-extrabold">Privacy policy and terms</h2>
      <p className="mt-1 text-sm text-[#5f6268]">
        Shown on this franchise&apos;s /privacy and /terms pages. Blank lines start a new paragraph, &quot;## &quot; a heading, &quot;- &quot; a list item.
        {franchise.is_default ? " Left blank, the site's standard pages are used." : " Have them legally reviewed for the country before going live."}
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <label><span className={lbl}>Privacy policy</span><textarea className={area} value={privacy} onChange={(e) => setPrivacy(e.target.value)} /></label>
        <label><span className={lbl}>Terms</span><textarea className={area} value={terms} onChange={(e) => setTerms(e.target.value)} /></label>
      </div>
      <Button className="mt-3" size="sm" disabled={update.isPending}
        onClick={() => update.mutate({ privacy_body: privacy, terms_body: terms }, {
          onSuccess: () => toast({ title: "Legal pages saved", variant: "success" }),
          onError: (err) => toast({ title: "Not saved", description: apiError(err, "Please try again."), variant: "error" }),
        })}
        style={{ background: "#c96c83", border: "none", color: "#fff" }}>
        {update.isPending ? "Saving…" : "Save legal pages"}
      </Button>
    </DashboardPanel>
  )
}
