// Shared visual system for the purpose-built STAFF mobile app. A work tool: the
// customer app is warm/editorial, the staff app is calmer and more utilitarian
// (denser info, clear status colors) while staying on the BAYD palette. One
// source of truth so every staff screen reads the same.

export const staffTheme = {
  ink: "#14100F",
  paper: "#F4F2EF",
  blush: "#C96C83",
  live: "#4E9A57", // on-shift / clocked-in green
  amber: "#C98A2E",
  tabBarHeight: "4.25rem",
} as const

// Full-height paper background, room for the bottom tab bar. The TOP safe-area
// inset is supplied by StaffHeader or the screen itself, not here - applying it
// in both places double-counts the notch.
export const staffScreenClass =
  "min-h-dvh bg-[#F4F2EF] text-[#14100F] pb-[calc(4.25rem+env(safe-area-inset-bottom))]"

// Heading style - heavy, tight (matches the customer app's display so the brand
// reads consistent across both apps).
export const displayClass = "font-black tracking-tight"

// A flat work-surface card: white, hairline border, subtle shadow.
export const cardClass =
  "rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(20,16,15,0.04),0_6px_20px_-14px_rgba(20,16,15,0.12)]"

// Small uppercase section label.
export const eyebrowClass =
  "text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#14100F]/40"

export const mutedClass = "text-[#14100F]/55"

export const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base text-[#14100F] outline-none transition-colors placeholder:text-[#14100F]/35 focus:border-[#C96C83]"

export const labelClass =
  "mb-1.5 block text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#14100F]/45"

// Status pill colors, shared by schedule + shifts.
export function bookingStatusStyle(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-[#C96C83]/12 text-[#C96C83]"
    case "in_progress":
      return "bg-[#4E9A57]/15 text-[#3f7e47]"
    case "completed":
      return "bg-black/8 text-[#14100F]/55"
    case "cancelled":
    case "no_show":
      return "bg-[#8f3f4b]/12 text-[#8f3f4b]"
    case "missed":
      return "bg-[#14100F] text-white"
    default:
      return "bg-black/8 text-[#14100F]/55"
  }
}
