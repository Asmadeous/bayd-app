"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollReveal } from "@/components/scroll-reveal";
import { buttonVariants } from "@/components/ui/button";
import { BookButton } from "@/components/ui/book-button";
import type { BlogPost } from "@/features/blog/types/blog-content";
import { cn } from "@/lib/utils";

type BlogArticlePageProps = {
  post: BlogPost;
};

export function BlogArticlePage({ post }: BlogArticlePageProps) {
  const paragraphs = post.body
    ? post.body.split(/\n{2,}/).filter(Boolean)
    : getArticleParagraphs(post);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        {/* Masthead split — title block + framed cover image */}
        <article className="bg-[#f4f1eb] text-[#101217]">
          <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:pb-20 lg:pt-16 2xl:px-10">
            <ScrollReveal className="flex min-h-[420px] flex-col justify-between lg:min-h-[520px]">
              <div>
                <Link
                  className="inline-flex items-center gap-2 text-sm font-extrabold text-[#5f6268] transition-colors hover:text-[#c96c83]"
                  href="/blog"
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Back to journal
                </Link>
                <p className="mt-10 text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
                  {post.category}
                </p>
                <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
                  {post.title}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a] sm:text-lg">
                  {post.excerpt}
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t-2 border-[#101217] pt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#5f6268]">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays aria-hidden="true" className="size-4" />
                  {post.publishedAt}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 aria-hidden="true" className="size-4" />
                  {post.readTime}
                </span>
              </div>
            </ScrollReveal>

            <ScrollReveal
              className="flex flex-col border-2 border-[#101217] bg-white"
              delay={90}
              variant="clip-up"
            >
              <div className="relative min-h-[320px] flex-1 overflow-hidden border-b-2 border-[#101217] bg-[#101217] lg:min-h-[560px]">
                <Image
                  src={post.image.src}
                  alt={post.image.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#5f6268]">
                <span>{post.category}</span>
                <Image
                  alt="Beauty at Your Door"
                  className="h-9 w-auto object-contain"
                  height={936}
                  src="/images/brand/bayd-logo-black.png"
                  unoptimized
                  width={3264}
                />
              </div>
            </ScrollReveal>
          </div>
        </article>

        {/* Body — columns + drop cap, with a framed side rail */}
        <section className="bg-background py-16 text-[#101217] sm:py-20">
          <div className="mx-auto grid w-full max-w-[1760px] gap-8 px-4 sm:px-6 lg:grid-cols-[1.5fr_0.7fr] lg:px-8 2xl:px-10">
            <ScrollReveal as="article" className="border-2 border-[#101217] bg-white p-5 sm:p-8 lg:p-10">
              <div
                className={cn(
                  "gap-8 text-base leading-7 text-[#3f4248] lg:columns-2",
                  "[&>p]:mb-5 [&>p]:break-inside-avoid",
                  "[&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-2 [&>p:first-of-type]:first-letter:text-6xl [&>p:first-of-type]:first-letter:font-extrabold [&>p:first-of-type]:first-letter:leading-[0.75] [&>p:first-of-type]:first-letter:text-[#c96c83]",
                )}
              >
                {paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal className="h-fit space-y-4 lg:sticky lg:top-24" delay={80}>
              <blockquote className="border-2 border-[#c96c83] bg-[#f0c8d3]/25 p-5 text-lg font-extrabold leading-snug tracking-tight text-[#101217]">
                &ldquo;{post.excerpt}&rdquo;
              </blockquote>

              <div className="border-2 border-[#101217] bg-[#f4f1eb] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
                  Quick Take
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                  Keep the routine simple, prepared, and easy to repeat.
                </h2>
                <BookButton
                  className={cn(
                    buttonVariants(),
                    "mt-6 h-12 w-full px-6 text-base font-bold",
                  )}
                >
                  Ask about this
                </BookButton>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function getArticleParagraphs(post: BlogPost) {
  return [
    post.excerpt,
    "Before a mobile beauty appointment, the best preparation is usually practical: choose a comfortable spot, clear a little working space, and make sure lighting, seating, and timing feel calm. These details help the provider focus on the service instead of rearranging the room.",
    "Aftercare should also be easy to remember. Keep the recommended products nearby, avoid rushing the first few hours after service, and ask your provider what to adjust based on your skin, lashes, nails, or event schedule.",
    "For group bookings, plan the order of services before guests arrive. A simple schedule gives everyone time to relax, take photos, eat, and enjoy the appointment without crowding the provider or delaying the final guest.",
  ];
}
