"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, BadgeCheck, UserRound } from "lucide-react"

import { ScrollReveal } from "@/components/scroll-reveal"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { BookButton } from "@/components/ui/book-button"
import { buttonVariants } from "@/components/ui/button"
import { Stars } from "@/features/team/components/stars"
import { useTeamMember, type TeamReview } from "@/lib/hooks/use-team"
import { cn } from "@/lib/utils"

export function TeamMemberPage({ id }: { id: string }) {
  const { data: member, isLoading, isError } = useTeamMember(id)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="bg-background text-[#101217]">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Link
            href="/team"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f6268] transition-colors hover:text-[#c96c83]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> All team members
          </Link>

          {isLoading ? (
            <p className="mt-10 text-sm text-[#5f6268]">Loading profile…</p>
          ) : isError || !member ? (
            <p className="mt-10 text-sm text-[#5f6268]">
              This team member could not be found.
            </p>
          ) : (
            <>
              <ScrollReveal className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="relative aspect-[4/5] w-full overflow-hidden border border-black/10 bg-[#e8dfd6]">
                  {member.photo_url ? (
                    <Image
                      alt={member.name}
                      src={member.photo_url}
                      fill
                      sizes="(min-width: 1024px) 32vw, 100vw"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[#c8b9aa]">
                      <UserRound className="size-28" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                    {member.name}
                  </h1>
                  {member.title && (
                    <p className="mt-2 text-lg text-[#5f6268]">{member.title}</p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {member.reviews_count > 0 ? (
                      <>
                        <Stars rating={member.average_rating ?? 0} size={18} />
                        <span className="text-lg font-bold">
                          {member.average_rating?.toFixed(1)}
                        </span>
                        <span className="text-sm text-[#5f6268]">
                          from {member.reviews_count} review
                          {member.reviews_count === 1 ? "" : "s"}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-[#5f6268]">No reviews yet</span>
                    )}
                    {member.years_experience ? (
                      <span className="inline-flex items-center gap-1.5 border border-black/10 bg-[#f4f1eb] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#a36f4d]">
                        <BadgeCheck className="size-3.5" aria-hidden="true" />
                        {member.years_experience} yrs experience
                      </span>
                    ) : null}
                  </div>

                  {member.bio && (
                    <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a]">
                      {member.bio}
                    </p>
                  )}

                  {member.services.length > 0 && (
                    <div className="mt-7">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777a80]">
                        Services offered
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {member.services.map((s) => (
                          <span
                            key={s.id}
                            className="border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold text-[#101217]"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <BookButton
                    className={cn(
                      buttonVariants(),
                      "mt-8 h-12 w-fit px-6 text-base font-bold",
                    )}
                  >
                    Book a service
                  </BookButton>
                </div>
              </ScrollReveal>

              <section className="mt-14">
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Client reviews
                </h2>
                {member.reviews.length === 0 ? (
                  <p className="mt-4 text-sm text-[#5f6268]">
                    No reviews yet — be the first to book and share your experience.
                  </p>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {member.reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function ReviewCard({ review }: { review: TeamReview }) {
  return (
    <div className="border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <Stars rating={review.rating} />
        {review.featured && (
          <span className="bg-[#c96c83] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
            Featured
          </span>
        )}
      </div>
      {review.body && (
        <p className="mt-3 text-sm leading-6 text-[#4f535a]">{review.body}</p>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-[#777a80]">
        <span className="font-semibold text-[#101217]">{review.reviewer_name}</span>
        <span>{new Date(review.created_at).toLocaleDateString("en-CA")}</span>
      </div>
    </div>
  )
}
