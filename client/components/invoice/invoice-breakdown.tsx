import type { ReactNode } from "react"

import type { Invoice, InvoiceAddress } from "@/lib/hooks/use-invoices"

const cad = (value: string | number | undefined) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(value ?? 0))

function addressLines(a: InvoiceAddress) {
  return [
    a.line1,
    a.line2,
    [a.city, a.province, a.postal_code].filter(Boolean).join(", "),
    a.buzz_code ? `Buzz code: ${a.buzz_code}` : null,
  ].filter(Boolean) as string[]
}

// The full invoice body: who billed whom, where and when the service happened,
// who performed it, every line with its rate, tax, tip, payments by method, and
// what's still owed. Same content as the PDF, from the invoice's snapshot, so
// the web dashboard and both apps show identical breakdowns. Invoices issued
// before the snapshot existed show only what they stored.
export function InvoiceBreakdown({ invoice }: { invoice: Invoice }) {
  const d = invoice.details ?? {}
  const a = d.appointment
  const address = d.service_address ?? d.shipping_address
  const taxPct = Math.round(Number(invoice.tax_rate) * 100)
  const time = a ? [a.start_time, a.end_time].filter(Boolean).join(" - ") : ""

  return (
    <div className="space-y-5 text-sm text-[#101217]">
      <div className="grid gap-4 sm:grid-cols-2">
        {d.business ? (
          <Block title="From">
            <p className="font-bold">{d.business.name}</p>
            {[d.business.address, d.business.phone, d.business.email, d.business.website].filter(Boolean).map((l) => (
              <p key={l} className="text-[#5f6268]">{l}</p>
            ))}
            {d.business.hst_number ? <p className="text-[#5f6268]">GST/HST {d.business.hst_number}</p> : null}
          </Block>
        ) : null}
        <Block title="Bill to">
          <p className="font-bold">{d.bill_to?.name ?? invoice.customer.name}</p>
          <p className="text-[#5f6268]">{d.bill_to?.email ?? invoice.customer.email}</p>
          {d.bill_to?.phone ? <p className="text-[#5f6268]">{d.bill_to.phone}</p> : null}
        </Block>
        {d.booked_for ? (
          <Block title="Appointment for">
            {d.booked_for.name ? <p className="font-bold">{d.booked_for.name}</p> : null}
            {d.booked_for.phone ? <p className="text-[#5f6268]">{d.booked_for.phone}</p> : null}
          </Block>
        ) : null}
        {address ? (
          <Block title={d.service_address ? "Service address" : "Ship to"}>
            {addressLines(address).map((l, i) => (
              <p key={l} className={i === 0 ? "font-bold" : "text-[#5f6268]"}>{l}</p>
            ))}
          </Block>
        ) : null}
      </div>

      {a ? (
        <Block title="Appointment">
          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1">
            <Row label="Reference" value={a.reference} />
            <Row label="Date" value={a.date} />
            <Row label="Time" value={time ? `${time}${a.timezone ? ` ${a.timezone}` : ""}` : undefined} />
            <Row label="Duration" value={a.duration_minutes ? `${a.duration_minutes} min` : undefined} />
            <Row label="Service" value={[a.service, a.category ? `(${a.category})` : null].filter(Boolean).join(" ")} />
            <Row label="Technician" value={[a.technician, a.technician_title].filter(Boolean).join(" - ")} />
            <Row label="Client" value={a.client_type === "group" ? `Group of ${a.party_size}` : a.client_type && a.client_type !== "adult" ? a.client_type : undefined} />
            <Row label="Status" value={a.status?.replace("_", " ")} />
          </dl>
        </Block>
      ) : null}

      <Block title="Details">
        <div className="grid grid-cols-[1fr_2.5rem_5rem_5.5rem] gap-2 border-b border-black/10 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#6b6f76]">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-black/8">
          {invoice.line_items.map((item, i) => (
            <div key={`${item.description}-${i}`} className="grid grid-cols-[1fr_2.5rem_5rem_5.5rem] gap-2 py-2.5">
              <span className="font-semibold">{item.description}</span>
              <span className="text-right text-[#5f6268]">{item.quantity}</span>
              <span className="text-right text-[#5f6268]">{cad(item.unit_price)}</span>
              <span className="text-right font-semibold">{cad(item.amount)}</span>
            </div>
          ))}
        </div>
      </Block>

      <div className="ml-auto w-full max-w-xs space-y-1.5 border-t border-black/10 pt-3">
        <Total label="Subtotal (before tax)" value={cad(invoice.subtotal)} />
        <Total label={taxPct ? `HST (${taxPct}%), included` : "Tax"} value={cad(invoice.tax)} />
        <Total label={`Total ${invoice.currency}`} value={cad(invoice.total)} strong />
        {d.tip ? <Total label="Tip (not taxed)" value={cad(d.tip)} /> : null}
        {d.amount_paid !== undefined ? (
          <>
            <Total label="Amount paid" value={`-${cad(d.amount_paid)}`} />
            <Total label="Balance due" value={cad(d.balance_due)} strong accent={(d.balance_due ?? 0) > 0} />
          </>
        ) : null}
      </div>

      {d.payments?.length ? (
        <Block title="Payments">
          <div className="divide-y divide-black/8">
            {d.payments.map((p, i) => (
              <div key={i} className="grid grid-cols-[6rem_1fr_5.5rem] gap-2 py-2">
                <span className="text-[#5f6268]">{p.date}</span>
                <span>
                  {p.method}
                  {p.reference ? <span className="text-[#8a8d93]"> ...{p.reference}</span> : null}
                </span>
                <span className="text-right font-semibold">{cad(p.amount)}</span>
              </div>
            ))}
          </div>
        </Block>
      ) : null}
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#6b6f76]">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <>
      <dt className="font-semibold text-[#5f6268]">{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

function Total({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-extrabold" : "text-[#5f6268]"} ${accent ? "text-[#c96c83]" : ""}`}>
      <span>{label}</span>
      <span className={strong ? "" : "text-[#101217]"}>{value}</span>
    </div>
  )
}
