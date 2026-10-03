// Shared by server and client code: the public franchise setup and how money
// is shown. The live config is held by lib/stores/franchise-store.ts.

export interface FranchiseConfig {
  slug: string
  name: string
  country_code: string
  currency: string
  locale: string
  time_zone: string
  open_hour: number
  close_hour: number
  tax_name: string | null
  tax_rate: string
  contact_email: string | null
  contact_phone: string | null
  staff_email_domain: string
  payments: {
    square_application_id: string | null
    square_location_id: string | null
  }
}

// Today's business, used until the config arrives (and on the server, which
// gets the default franchise's catalog).
export const DEFAULT_FRANCHISE: FranchiseConfig = {
  slug: "canada", name: "B.A.Y.D Canada", country_code: "CA", currency: "CAD", locale: "en-CA",
  time_zone: process.env.NEXT_PUBLIC_BOOKING_TIMEZONE ?? "America/Toronto", open_hour: 9, close_hour: 19,
  tax_name: "HST", tax_rate: "0.13", contact_email: null, contact_phone: null, staff_email_domain: "baydspa.ca",
  payments: { square_application_id: null, square_location_id: null },
}

export function formatMoneyIn(
  config: Pick<FranchiseConfig, "locale" | "currency">,
  value: string | number | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat(config.locale, { style: "currency", currency: config.currency, ...options })
    .format(Number.isFinite(amount) ? amount : 0)
}
