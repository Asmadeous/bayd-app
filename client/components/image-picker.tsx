"use client"

import { useEffect, useRef, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { ImagePlus } from "lucide-react"

// Shared photo picker: replaces "paste an image URL" everywhere. Returns a File
// to the caller (upload it as multipart). On native (Capacitor) it opens the
// camera / photo library; on web it's a file input. Shows a live preview of the
// current or newly-picked image.
//
// The parent owns the File and sends it (e.g. FormData append). This component
// only picks + previews.
export function ImagePicker({
  currentUrl,
  onPick,
  label = "Photo",
  shape = "square",
}: {
  currentUrl?: string | null
  onPick: (file: File) => void
  label?: string
  shape?: "square" | "circle"
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  function setFromFile(file: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setPreview(url)
    onPick(file)
  }

  // Native: open the Capacitor camera/library and convert the result to a File.
  async function pickNative() {
    try {
      const { Camera: Cam, CameraResultType, CameraSource } = await import("@capacitor/camera")
      const photo = await Cam.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt, // let the user choose camera or gallery
      })
      if (!photo.webPath) return
      const res = await fetch(photo.webPath)
      const blob = await res.blob()
      const ext = photo.format || "jpeg"
      const file = new File([blob], `photo.${ext}`, { type: blob.type || `image/${ext}` })
      setFromFile(file)
    } catch {
      // Cancelled or unavailable - no-op.
    }
  }

  function pick() {
    if (Capacitor.isNativePlatform()) {
      void pickNative()
    } else {
      inputRef.current?.click()
    }
  }

  const rounded = shape === "circle" ? "rounded-full" : "rounded-xl"

  return (
    <div className="flex items-center gap-4">
      <span
        className={`grid size-20 shrink-0 place-items-center overflow-hidden border border-black/10 bg-black/5 ${rounded}`}
        aria-hidden
      >
        {preview ? (
          <span className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} />
        ) : (
          <ImagePlus className="size-6 text-black/30" />
        )}
      </span>

      <div>
        <button
          type="button"
          onClick={pick}
          className="flex items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#101217] transition-colors hover:border-[#c96c83]"
        >
          <ImagePlus className="size-4" aria-hidden />
          {preview ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        <p className="mt-1.5 text-xs text-[#6b6f76]">JPG, PNG, WEBP or GIF.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setFromFile(file)
        }}
      />
    </div>
  )
}
