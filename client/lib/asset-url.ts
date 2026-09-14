import { siteConfig } from "@/lib/site"

// Resolve an image/asset URL that the API returns as a ROOT-RELATIVE path
// (e.g. "/images/services/nails-manicure.webp"). Those live in the website's
// public dir and are served by the website origin (baydspa.ca) - they are NOT
// bundled into the mobile app and NOT served by the API host. So in the app
// (origin https://localhost) a bare "/images/..." 404s.
//
// This prefixes root-relative paths with the site origin so they load from the
// host that actually serves them. Absolute URLs (http/https/data/blob) and
// already-absolute asset URLs pass through untouched, so the website (same
// origin) is unaffected too.
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  if (path.startsWith("/")) return `${siteConfig.url}${path}`
  return path
}
