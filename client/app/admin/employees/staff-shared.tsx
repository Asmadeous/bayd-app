import { assetUrl } from "@/lib/asset-url"

// Pieces the Employees list and the staff screen share.

export const KPI_PERIODS = ["30d", "90d", "ytd", "all"] as const
export const KPI_PERIOD_LABEL: Record<string, string> = { "30d": "30 days", "90d": "90 days", ytd: "Year", all: "All time" }

export function Avatar({ photo, name, size = "size-12" }: { photo?: string | null; name: string; size?: string }) {
  return (
    <span className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#F6E9ED] text-base font-bold text-[#9E4A60]`}>
      {photo ? <span role="img" aria-label={name} className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${assetUrl(photo)})` }} /> : (name[0] ?? "?")}
    </span>
  )
}
