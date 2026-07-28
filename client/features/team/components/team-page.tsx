"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Star, UserRound } from "lucide-react"

import { ScrollReveal } from "@/components/scroll-reveal"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { Stars } from "@/features/team/components/stars"
import { useTeam, type TeamMember } from "@/lib/hooks/use-team"

export function TeamPage() {
  const { data: members, isLoading } = useTeam()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <TeamHero />
        <section className="bg-background py-20 text-[#101217]">
          <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
            {isLoading ? (
              <p className="text-sm text-[#5f6268]">Loading our team…</p>
            ) : !members || members.length === 0 ? (
              <p className="text-sm text-[#5f6268]">
                Our team profiles are coming soon.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {members.map((member, index) => (
                  <ScrollReveal
                    key={member.id}
                    delay={(index % 4) * 70}
                    variant="scale-up"
                  >
                    <TeamCard member={member} />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function TeamHero() {
  return (
    <section className="overflow-hidden bg-[#f4f1eb] text-[#101217]">
      <div className="mx-auto w-full max-w-[1760px] px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16 2xl:px-10">
        <ScrollReveal variant="fade-right">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
            Our Team
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            Meet the professionals behind every booking.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a] sm:text-lg">
            Every technician is rated by the clients they serve. Browse profiles,
            read honest reviews, and see who you&apos;ll be welcoming to your door.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <Link
      href={`/team/${member.id}`}
      className="group relative flex h-full flex-col overflow-hidden border border-black/10 bg-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#e8dfd6]">
        {member.photo_url ? (
          <Image
            alt={member.name}
            src={member.photo_url}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[#c8b9aa]">
            <UserRound className="size-20" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-[#101217]">
              {member.name}
            </h3>
            {member.title && (
              <p className="text-sm text-[#5f6268]">{member.title}</p>
            )}
          </div>
          <ArrowUpRight
            className="size-5 shrink-0 text-[#c96c83] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          {member.reviews_count > 0 ? (
            <>
              <Stars rating={member.average_rating ?? 0} />
              <span className="text-sm font-semibold text-[#101217]">
                {member.average_rating?.toFixed(1)}
              </span>
              <span className="text-xs text-[#5f6268]">
                ({member.reviews_count})
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-[#5f6268]">
              <Star className="size-3.5" aria-hidden="true" /> No reviews yet
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
