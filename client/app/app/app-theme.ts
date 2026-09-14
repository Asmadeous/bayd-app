// Shared visual system for the purpose-built customer mobile app. One source of
// truth so every screen reads the same and dark mode is consistent. The app look
// is decoupled from the marketing website.
//
// Direction: boutique at-home beauty - warm cream paper, deep warm ink, blush
// accent, an editorial serif (Fraunces) for headings. Cards feel like pressed
// paper (warm surface + soft layered shadow), not flat gray boxes.

export const appTheme = {
  ink: "#14100F",
  paper: "#F6F1EC",
  blush: "#C96C83",
  rose: "#F0C8D3",
  plum: "#4A2C38",
  gold: "#C9A45C",
  tabBarHeight: "4.5rem",
} as const

// Page shell: full-height warm paper, room for the bottom tab bar. The TOP
// safe-area inset belongs to whatever renders first inside the shell (AppHeader,
// SectionScreen, or the screen's own pt-[calc(...+env(safe-area-inset-top))]) -
// adding it here too would double-count the notch and push every screen down.
export const appScreenClass =
  "min-h-dvh bg-[#F6F1EC] text-[#14100F] pb-[calc(4.5rem+env(safe-area-inset-bottom))]"

// Display heading style: matches the Book flow's headings (Plus Jakarta Sans,
// heavy weight, tight tracking) so every screen title reads the same as Book.
export const displayClass = "font-black tracking-tight"

// A "pressed paper" card: warm surface, hairline border, soft layered shadow.

export const cardClass =
  "rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(20,16,15,0.04),0_8px_24px_-12px_rgba(20,16,15,0.12)]"

// Small uppercase section label (eyebrow).
export const eyebrowClass =
  "text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#14100F]/40"

// Muted body text.
export const mutedClass = "text-[#14100F]/55"

// A form input / textarea: warm surface, hairline border, blush focus ring.
export const inputClass =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-base text-[#14100F] outline-none transition-colors placeholder:text-[#14100F]/35 focus:border-[#C96C83]"

// A small uppercase field label.
export const labelClass =
  "mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#14100F]/45"
