import { assetUrl } from "@/lib/asset-url"
import { cn } from "@/lib/utils"

// The other person's photo in a chat, or their initial when they have none.
export function ChatAvatar({
  name,
  url,
  className,
}: {
  name: string | null | undefined
  url: string | null | undefined
  className?: string
}) {
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f0ece4] text-base font-bold text-[#C96C83]",
        className,
      )}
    >
      {url ? (
        <span className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${assetUrl(url)})` }} aria-hidden />
      ) : (
        (name?.trim() || "B").charAt(0).toUpperCase()
      )}
    </span>
  )
}
