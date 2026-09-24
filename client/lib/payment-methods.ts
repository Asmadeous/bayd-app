// Payment methods we accept (see the site footer). For card, the tech enters the
// client's card into Square's form on their own device; the rest are collected
// in person and recorded by the tech.
export type OfflinePaymentMethod = "cash" | "interac" | "cheque"
export type PaymentMethod = "card" | "gift_card" | OfflinePaymentMethod

export const CHARGE_METHODS: { value: "card" | OfflinePaymentMethod; label: string; hint: string }[] = [
  { value: "card", label: "Card", hint: "Enter the client's card (Visa, Mastercard, debit)" },
  { value: "cash", label: "Cash", hint: "Collected in person" },
  { value: "interac", label: "Interac e-Transfer", hint: "Client sent an e-Transfer" },
  { value: "cheque", label: "Cheque", hint: "Collected in person" },
]

const LABELS: Record<PaymentMethod, string> = {
  card: "Card",
  gift_card: "Gift card",
  cash: "Cash",
  interac: "Interac e-Transfer",
  cheque: "Cheque",
}

export function paymentMethodLabel(method: string) {
  return LABELS[method as PaymentMethod] ?? method
}
