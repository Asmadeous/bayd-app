import { z } from "zod"

import type { PartnerInput } from "@/lib/hooks/use-partners"

// The partner form's rules, shared by the web Partners page and the BAYD Admin
// app.

export const BLANK: PartnerInput = { name: "", email: "", phone: "", platform_fee_pct: "20", status: "active", payout_notes: "", password: "" }
export type PartnerFormErrors = Partial<Record<keyof PartnerInput | "base", string>>

export const partnerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  // Email is the partner-provider's login, so it's required on create (validated
  // as such in save() where editingId is known); still shape-validated here.
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address."),
  phone: z.string().trim().optional(),
  platform_fee_pct: z
    .string()
    .trim()
    .min(1, "Platform fee is required.")
    .refine((value) => Number.isFinite(Number(value)), "Platform fee must be a number.")
    .refine((value) => Number(value) >= 0 && Number(value) <= 100, "Platform fee must be between 0 and 100."),
  status: z.enum(["active", "inactive"]),
  payout_notes: z.string().trim().optional(),
  password: z.string().trim().optional(),
})

export function normalizePartnerInput(input: PartnerInput): PartnerInput {
  return {
    name: input.name?.trim(),
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    platform_fee_pct: input.platform_fee_pct?.trim(),
    status: input.status,
    payout_notes: input.payout_notes?.trim() || "",
    // Carried through so a create sets the partner-provider's login password;
    // omitted (undefined → dropped) when blank so edits don't touch it.
    ...(input.password?.trim() ? { password: input.password.trim() } : {}),
  }
}

export function getPartnerFieldErrors(error: z.ZodError<PartnerInput>): PartnerFormErrors {
  const next: PartnerFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !next[key as keyof PartnerFormErrors]) {
      next[key as keyof PartnerFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}
