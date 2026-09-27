"use client"

import Link from "next/link"

import { assetUrl } from "@/lib/asset-url"
import { hapticTap } from "@/lib/native/haptics"

// Top-right avatar on the apps' home screens: the person's photo, or their first
// initial when they have none. Opens their profile.
export function HeaderAvatar({ href, photoUrl, name }: { href: string; photoUrl?: string | null; name: string }) {
  return (
    <Link
      href={href}
      onClick={() => hapticTap()}
      aria-label="Profile"
      className="grid size-13 shrink-0 place-items-center overflow-hidden rounded-full bg-[#E9D3D9] text-base font-extrabold text-[#8A3F53] shadow-sm"
    >
      {photoUrl ? (
        <span
          className="size-full bg-cover bg-center"
          style={{ backgroundImage: `url(${assetUrl(photoUrl)})` }}
          aria-hidden
        />
      ) : (
        <span aria-hidden>{name.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </Link>
  )
}
