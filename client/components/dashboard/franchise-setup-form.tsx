"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import type { Franchise, FranchiseInput } from "@/lib/hooks/use-super"

// ISO 3166-1 alpha-2 codes; names come from the browser (Intl.DisplayNames).
const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ")

function displayName(type: "region" | "currency", code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) ?? code
  } catch {
    return code
  }
}

function supported(key: "currency" | "timeZone"): string[] {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
  return fn ? fn(key) : []
}

const field =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none focus:border-[#c96c83]"
const lbl = "mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

// Everything a country differs on, as data. Tax is shown as a percentage and
// stored as a fraction (20% -> 0.2).
export function FranchiseSetupForm({
  franchise,
  saving,
  submitLabel,
  onSubmit,
  error,
}: {
  franchise?: Franchise
  saving: boolean
  submitLabel: string
  onSubmit: (input: FranchiseInput) => void
  error?: string | null
}) {
  const [form, setForm] = useState(() => ({
    name: franchise?.name ?? "",
    slug: franchise?.slug ?? "",
    country_code: franchise?.country_code ?? "",
    currency: franchise?.currency ?? "",
    locale: franchise?.locale ?? "en",
    time_zone: franchise?.time_zone ?? "",
    open_hour: String(franchise?.open_hour ?? 9),
    close_hour: String(franchise?.close_hour ?? 19),
    tax_name: franchise?.tax_name ?? "",
    tax_pct: franchise ? String(Number(franchise.tax_rate) * 100) : "",
    tax_registration_number: franchise?.tax_registration_number ?? "",
    contact_email: franchise?.contact_email ?? "",
    contact_phone: franchise?.contact_phone ?? "",
    reply_to_email: franchise?.reply_to_email ?? "",
    sender_name: franchise?.sender_name ?? "",
    sms_sender: franchise?.sms_sender ?? "",
    business_address: franchise?.business_address ?? "",
    staff_email_domain: franchise?.staff_email_domain ?? "",
    subdomain: franchise?.subdomain ?? "",
    custom_domain: franchise?.custom_domain ?? "",
    royalty_pct: franchise ? String(Number(franchise.royalty_pct)) : "",
  }))
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const countries = useMemo(
    () => COUNTRY_CODES.map((c) => ({ code: c, name: displayName("region", c) })).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )
  const currencies = useMemo(() => supported("currency"), [])
  const zones = useMemo(() => supported("timeZone"), [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const { tax_pct, ...rest } = form
    onSubmit({
      ...rest,
      open_hour: Number(form.open_hour),
      close_hour: Number(form.close_hour),
      tax_rate: String((Number(tax_pct) || 0) / 100),
      royalty_pct: form.royalty_pct || "0",
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? (
        <p aria-live="polite" className="border border-[#b75c68]/25 bg-[#fff5f6] px-3 py-2 text-sm font-semibold text-[#8f3f4b]">
          {error}
        </p>
      ) : null}

      <Section title="Branch">
        <Field label="Name"><input className={field} value={form.name} onChange={set("name")} required placeholder="B.A.Y.D UK" /></Field>
        <Field label="Short name (in links)"><input className={field} value={form.slug} onChange={set("slug")} placeholder="uk" /></Field>
        <Field label="Country">
          <select className={field} value={form.country_code} onChange={set("country_code")} required>
            <option value="">Choose…</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Currency">
          <select className={field} value={form.currency} onChange={set("currency")} required>
            <option value="">Choose…</option>
            {currencies.map((c) => <option key={c} value={c}>{c} · {displayName("currency", c)}</option>)}
          </select>
        </Field>
        <Field label="Time zone">
          <select className={field} value={form.time_zone} onChange={set("time_zone")} required>
            <option value="">Choose…</option>
            {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
        <Field label="Language and number format"><input className={field} value={form.locale} onChange={set("locale")} placeholder="en-GB" /></Field>
        <Field label="Opens (hour, 0-24)"><input className={field} type="number" min={0} max={24} value={form.open_hour} onChange={set("open_hour")} /></Field>
        <Field label="Closes (hour, 0-24)"><input className={field} type="number" min={0} max={24} value={form.close_hour} onChange={set("close_hour")} /></Field>
      </Section>

      <Section title="Tax">
        <Field label="Tax name"><input className={field} value={form.tax_name} onChange={set("tax_name")} placeholder="VAT" /></Field>
        <Field label="Tax rate (%)"><input className={field} inputMode="decimal" value={form.tax_pct} onChange={set("tax_pct")} placeholder="20" /></Field>
        <Field label="Tax registration number"><input className={field} value={form.tax_registration_number} onChange={set("tax_registration_number")} /></Field>
      </Section>

      <Section title="Contacts">
        <Field label="Contact email"><input className={field} type="email" value={form.contact_email} onChange={set("contact_email")} /></Field>
        <Field label="Contact phone"><input className={field} value={form.contact_phone} onChange={set("contact_phone")} /></Field>
        <Field label="Reply-to email"><input className={field} type="email" value={form.reply_to_email} onChange={set("reply_to_email")} /></Field>
        <Field label="Name on emails and invoices"><input className={field} value={form.sender_name} onChange={set("sender_name")} placeholder="Beauty @ Your Door UK" /></Field>
        <Field label="SMS sender name"><input className={field} value={form.sms_sender} onChange={set("sms_sender")} /></Field>
        <Field label="Business address (on invoices)"><input className={field} value={form.business_address} onChange={set("business_address")} /></Field>
      </Section>

      <Section title="Staff and website">
        <Field label="Staff email domain"><input className={field} value={form.staff_email_domain} onChange={set("staff_email_domain")} placeholder="bayd.co.uk" /></Field>
        <Field label="Subdomain"><input className={field} value={form.subdomain} onChange={set("subdomain")} placeholder="uk" /></Field>
        <Field label="Own domain (optional)"><input className={field} value={form.custom_domain} onChange={set("custom_domain")} placeholder="baydspa.co.uk" /></Field>
        <Field label="Royalty (% of money received)"><input className={field} inputMode="decimal" value={form.royalty_pct} onChange={set("royalty_pct")} placeholder="8" /></Field>
      </Section>

      <Button type="submit" size="sm" disabled={saving} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
        {saving ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-black/10 bg-white p-4">
      <legend className="px-1 text-sm font-extrabold text-[#101217]">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={lbl}>{label}</span>
      {children}
    </label>
  )
}
