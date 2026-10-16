"use client"

import { useQuery } from "@tanstack/react-query"

import api from "@/lib/api"
import { assetUrl } from "@/lib/asset-url"
import { AppHeader } from "../app-header"
import { appScreenClass, cardClass, eyebrowClass, mutedClass } from "../app-theme"

interface PublicService {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  price: string
  image_url: string | null
  category_name: string | null
}

// Book, signed out (iOS keeps the app open, see guest-browse): every service
// with its price and length, no details asked. Booking one is an account
// feature, so it asks the customer to sign in.
export function GuestServices({ onBook }: { onBook: () => void }) {
  const { data: services = [], isLoading } = useQuery<PublicService[]>({
    queryKey: ["public-services"],
    queryFn: () => api.get<PublicService[]>("/services").then((r) => r.data),
  })
  const groups = new Map<string, PublicService[]>()
  for (const s of services) {
    const key = s.category_name ?? "Services"
    groups.set(key, [...(groups.get(key) ?? []), s])
  }

  return (
    <div className={appScreenClass}>
      <AppHeader title="Book a visit" back />
      <p className={`px-5 pb-4 text-sm ${mutedClass}`}>At-home beauty services with prices. Sign in when you&apos;re ready to book.</p>
      <div className="space-y-6 px-5">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : (
          [...groups].map(([category, items]) => (
            <section key={category}>
              <h2 className={`mb-3 ${eyebrowClass}`}>{category}</h2>
              <div className="space-y-3">
                {items.map((s) => (
                  <div key={s.id} className={`${cardClass} flex gap-3 p-3`}>
                    {s.image_url ? (
                      <span
                        role="img"
                        aria-label={s.name}
                        className="size-20 shrink-0 rounded-xl bg-cover bg-center"
                        style={{ backgroundImage: `url(${assetUrl(s.image_url)})` }}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{s.name}</p>
                      <p className={`text-sm ${mutedClass}`}>
                        ${Number(s.price).toFixed(2)} · {s.duration_minutes} min
                      </p>
                      {s.description ? <p className={`mt-1 line-clamp-2 text-sm ${mutedClass}`}>{s.description}</p> : null}
                      <button
                        type="button"
                        onClick={onBook}
                        className="mt-2 h-9 rounded-xl bg-[#C96C83] px-4 text-sm font-bold text-white"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
