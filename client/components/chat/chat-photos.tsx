"use client"

import { useEffect, useRef, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { ImagePlus, X } from "lucide-react"

import { pickNativePhoto } from "@/components/image-picker"
import { assetUrl } from "@/lib/asset-url"
import { cn } from "@/lib/utils"

// Photos in chat: the composer's attach button, the preview before sending, and
// the photo inside a message bubble (tap to see it full screen).

// Phone photos are scaled to this width on the device before upload.
const PHOTO_WIDTH = 1600

export function ChatPhotoButton({ onPick, className }: { onPick: (file: File) => void; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)

  function pick() {
    if (Capacitor.isNativePlatform()) {
      void pickNativePhoto({ width: PHOTO_WIDTH }).then((file) => file && onPick(file))
    } else {
      inputRef.current?.click()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={pick}
        aria-label="Add a photo"
        className={cn("grid size-11 shrink-0 place-items-center rounded-full", className)}
      >
        <ImagePlus className="size-5" aria-hidden />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ""
        }}
      />
    </>
  )
}

// The picked photo above the composer, with a way to take it back out.
export function ChatPhotoPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = () => setUrl(typeof reader.result === "string" ? reader.result : null)
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])

  if (!url) return null
  return (
    <div className="relative mb-2 inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Photo to send" className="h-24 rounded-xl object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-[#14100F] text-white shadow"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

export function ChatPhoto({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  const src = assetUrl(url)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open photo" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Photo" className="max-h-72 w-full rounded-xl object-cover" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Photo"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[70] grid place-items-center bg-black/90 p-4 pt-[calc(1rem+var(--top-inset))]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Photo" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close photo"
            className="absolute right-4 top-[calc(1rem+var(--top-inset))] grid size-10 place-items-center rounded-full bg-white/15 text-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      )}
    </>
  )
}
