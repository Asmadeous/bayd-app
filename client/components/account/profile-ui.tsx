"use client"

import Link from "next/link"
import { Camera, ChevronRight, type LucideIcon } from "lucide-react"

import { assetUrl } from "@/lib/asset-url"
import { hapticTap } from "@/lib/native/haptics"
import { cn } from "@/lib/utils"

// Building blocks for the customer and staff Profile screens: a centred photo
// header, then grouped settings lists, one visual system for both apps.

export function ProfileHero({
  photoUrl,
  name,
  subtitle,
  editHref,
  children,
}: {
  photoUrl?: string | null
  name: string
  subtitle?: string | null
  editHref: string
  children?: React.ReactNode
}) {
  return (
    <section className="flex flex-col items-center pt-2 text-center">
      <Link href={editHref} onClick={() => hapticTap()} aria-label="Change photo" className="relative">
        <span className="grid size-24 place-items-center overflow-hidden rounded-full bg-[#E9D3D9] text-4xl font-black text-[#8A3F53]">
          {photoUrl ? (
            <span
              className="size-full bg-cover bg-center"
              style={{ backgroundImage: `url(${assetUrl(photoUrl)})` }}
              aria-hidden
            />
          ) : (
            <span aria-hidden>{name.trim().charAt(0).toUpperCase() || "?"}</span>
          )}
        </span>
        <span className="absolute bottom-0.5 right-0 grid size-8 place-items-center rounded-full border-[3px] border-[#F4F2EF] bg-[#14100F] text-white">
          <Camera className="size-3.5" aria-hidden />
        </span>
      </Link>
      <h1 className="mt-3 text-[1.6rem] font-black leading-tight tracking-[-0.02em] text-[#14100F]">{name}</h1>
      {subtitle ? <p className="mt-0.5 text-sm font-medium text-[#14100F]/60">{subtitle}</p> : null}
      {children}
      <Link
        href={editHref}
        onClick={() => hapticTap()}
        className="mt-4 rounded-full bg-[#14100F] px-5 py-2.5 text-sm font-extrabold text-white"
      >
        Edit profile
      </Link>
    </section>
  )
}

export function ProfileChip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[0.8125rem] font-bold text-[#14100F]">
      <Icon className="size-3.5 text-[#C96C83]" aria-hidden />
      {children}
    </span>
  )
}

export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section>
      {title ? (
        <h2 className="mb-2 px-1 text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-[#14100F]/50">{title}</h2>
      ) : null}
      <div className="divide-y divide-black/[0.05] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        {children}
      </div>
    </section>
  )
}

export function SettingsIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#F6E9ED] text-[#C96C83]">
      <Icon className="size-[1.1rem]" aria-hidden />
    </span>
  )
}

// A row that shows a value, links somewhere, or runs an action. `danger` is the
// sign-out tone.
export function SettingsRow({
  icon,
  label,
  value,
  href,
  onClick,
  danger = false,
}: {
  icon: LucideIcon
  label: string
  value?: string | null
  href?: string
  onClick?: () => void
  danger?: boolean
}) {
  const content = (
    <>
      <SettingsIcon icon={icon} />
      <span className={cn("min-w-0 flex-1 text-[0.9375rem] font-semibold", danger ? "text-[#8F3F4B]" : "text-[#14100F]")}>
        {label}
      </span>
      {value ? <span className="min-w-0 max-w-[55%] truncate text-sm text-[#14100F]/55">{value}</span> : null}
      {href || (onClick && !danger) ? <ChevronRight className="size-4 shrink-0 text-[#14100F]/30" aria-hidden /> : null}
    </>
  )
  const row = "flex w-full items-center gap-3 px-3.5 py-3 text-left"

  if (href) {
    return (
      <Link href={href} onClick={() => hapticTap()} className={row}>
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={row}>
        {content}
      </button>
    )
  }
  return <div className={row}>{content}</div>
}

export function SettingsToggle({
  icon,
  label,
  checked,
  disabled,
  onToggle,
}: {
  icon: LucideIcon
  label: string
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <SettingsIcon icon={icon} />
      <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold text-[#14100F]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40",
          checked ? "bg-[#C96C83]" : "bg-black/15",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  )
}

// Store rules want account deletion easy to find, not loud.
export const deleteAccountLinkClass =
  "mx-auto flex items-center justify-center gap-1.5 py-2 text-sm font-bold text-[#B3261E]"
