import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  Sparkles,
} from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollReveal } from "@/components/scroll-reveal";
import { buttonVariants } from "@/components/ui/button";
import { BookButton } from "@/components/ui/book-button";
import type {
  BlogGuide,
  BlogPageContent,
  BlogPost,
} from "@/features/blog/types/blog-content";
import { cn } from "@/lib/utils";

type BlogPageProps = {
  content: BlogPageContent;
};

const categories = ["All", "Lashes", "Nails", "Feet", "Events", "Aftercare"];

export function BlogPage({ content }: BlogPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        {content.featuredPost ? (
          <BlogHero featuredPost={content.featuredPost} />
        ) : (
          <BlogEmptyHero />
        )}
        <BlogLibrary guides={content.guides} posts={content.posts} />
        <BlogBookingBand />
      </main>
      <SiteFooter />
    </div>
  );
}

function BlogEmptyHero() {
  return (
    <section className="bg-[#f4f1eb] py-20 text-[#101217]">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
          Beauty Journal
        </p>
        <h1 className="mt-5 text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
          Guides for beauty care before and after we arrive.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a]">
          Articles coming soon.
        </p>
      </div>
    </section>
  );
}

function BlogHero({ featuredPost }: { featuredPost: BlogPost }) {
  return (
    <section className="overflow-hidden bg-[#f4f1eb] text-[#101217]">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8 lg:pb-20 lg:pt-16 2xl:px-10">
        <div className="flex min-h-[530px] flex-col justify-between">
          <ScrollReveal variant="fade-right">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
              Beauty Journal
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Guides for beauty care before and after we arrive.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a] sm:text-lg">
              Read service prep, aftercare, product pairings, and spa party
              ideas written for mobile beauty appointments at home, work,
              hotels, and events.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className={cn(
                  buttonVariants(),
                  "h-12 px-6 text-base font-bold",
                )}
                href="#latest"
              >
                Read latest
                <BookOpenText aria-hidden="true" />
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-12 border-black/20 bg-white/70 px-6 text-base hover:bg-white",
                )}
                href="/shop"
              >
                Shop aftercare
                <Sparkles aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal
            className="mt-10 grid gap-3 border-t border-black/10 pt-6 text-sm font-semibold text-[#4f535a] sm:grid-cols-3"
            delay={120}
          >
            <span>Service prep</span>
            <span>Beauty aftercare</span>
            <span>Group booking ideas</span>
          </ScrollReveal>
        </div>

        <ScrollReveal
          as="article"
          className="relative isolate flex min-h-[560px] flex-col justify-end overflow-hidden bg-[#101217] p-5 text-white shadow-sm sm:p-7 lg:min-h-[640px]"
          delay={90}
          variant="clip-up"
        >
          <Image
            src={featuredPost.image.src}
            alt={featuredPost.image.alt}
            fill
            priority
            sizes="(min-width: 1024px) 56vw, 100vw"
            className="-z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,18,23,0.1),rgba(16,18,23,0.86))]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(201,108,131,0.24))]" />
          <div className="max-w-3xl">
            <p className="w-fit bg-white px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#101217]">
              Featured Guide
            </p>
            <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {featuredPost.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
              {featuredPost.excerpt}
            </p>
            <PostMeta className="mt-6 text-white/74" post={featuredPost} />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/**
 * Magazine-style library: a dominant lead article with its excerpt set in
 * columns, the remaining posts flowing as framed "clippings" in a multi-column
 * grid, and a right rail stack of framed image cards + section index.
 * Collapses to a single column on mobile.
 */
function BlogLibrary({
  guides,
  posts,
}: {
  guides: BlogGuide[];
  posts: BlogPost[];
}) {
  const lead = posts[0];
  const rail = posts.slice(1, 3);
  const rest = posts.slice(3);

  return (
    <section className="bg-background py-16 text-[#101217] sm:py-20" id="latest">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal className="flex flex-col gap-6 border-b-2 border-[#101217] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
              Article Library
            </p>
            <h2 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl">
              Browse notes by service, routine, or occasion.
            </h2>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <span
                className="shrink-0 border border-[#101217]/15 bg-[#f4f1eb] px-4 py-2 text-sm font-extrabold text-[#101217]"
                key={category}
              >
                {category}
              </span>
            ))}
          </div>
        </ScrollReveal>

        {posts.length === 0 ? (
          <p className="mt-10 text-sm text-[#5f6268]">
            More articles coming soon.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:gap-8">
            {/* Main editorial column */}
            <div className="space-y-6">
              {lead && <LeadArticle post={lead} />}
              {rest.length > 0 && (
                <div className="gap-6 sm:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
                  {rest.map((post) => (
                    <ClippingCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>

            {/* Right rail — framed image stack + sections */}
            <aside className="h-fit space-y-5">
              {rail.length > 0 && (
                <div>
                  <p className="mb-3 border-b-2 border-[#101217] pb-1 text-lg font-extrabold tracking-tight">
                    Also in the journal
                  </p>
                  <div className="space-y-4">
                    {rail.map((post) => (
                      <ClippingCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {guides.length > 0 && (
                <div className="border-2 border-[#101217] bg-[#f4f1eb] p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a36f4d]">
                    Sections
                  </p>
                  <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                    {guides.map((guide) => (
                      <li
                        key={guide.title}
                        className="text-sm font-bold tracking-tight text-[#101217]"
                      >
                        {guide.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

function LeadArticle({ post }: { post: BlogPost }) {
  const paragraphs = post.body
    ? post.body.split(/\n{2,}/).filter(Boolean).slice(0, 3)
    : [post.excerpt];

  return (
    <Link
      href={post.href}
      className="group block border-2 border-[#101217] bg-white transition-shadow hover:shadow-[8px_8px_0_rgba(16,18,23,0.14)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-[#101217] bg-[#101217]">
        <Image
          src={post.image.src}
          alt={post.image.alt}
          fill
          sizes="(min-width: 1024px) 56vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 bg-[#f4f1eb] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#101217]">
          {post.category}
        </span>
      </div>
      <div className="p-5 sm:p-7">
        <PostMeta post={post} />
        <h3 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#101217] sm:text-4xl">
          {post.title}
        </h3>
        <div className="mt-4 gap-6 text-sm leading-6 text-[#4f535a] sm:columns-2 [&>p]:mb-3 [&>p]:break-inside-avoid">
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#101217] transition-colors group-hover:text-[#c96c83]">
          Read full guide
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function ClippingCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={post.href}
      className="group block border-2 border-[#101217]/15 bg-white transition-shadow hover:shadow-[5px_5px_0_rgba(16,18,23,0.12)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-[#101217]/15 bg-[#f4f1eb]">
        <Image
          src={post.image.src}
          alt={post.image.alt}
          fill
          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 bg-[#101217] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
          {post.category}
        </span>
      </div>
      <div className="p-4">
        <PostMeta post={post} />
        <h3 className="mt-2 text-xl font-extrabold leading-tight tracking-tight text-[#101217]">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5f6268]">
          {post.excerpt}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#101217] transition-colors group-hover:text-[#c96c83]">
          Read guide
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function PostMeta({
  className,
  post,
}: {
  className?: string;
  post: BlogPost;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5f6268]",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        <CalendarDays aria-hidden="true" className="size-4" />
        {post.publishedAt}
      </span>
      <span className="inline-flex items-center gap-2">
        <Clock3 aria-hidden="true" className="size-4" />
        {post.readTime}
      </span>
    </div>
  );
}

function BlogBookingBand() {
  return (
    <section className="bg-[#f4f1eb] py-18">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal className="grid gap-6 bg-[#101217] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f0c8d3]">
              Need personal guidance?
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Tell us your service, date, and beauty goals. We will help shape
              the prep and aftercare plan.
            </h2>
          </div>
          <BookButton
            className={cn(
              buttonVariants(),
              "h-12 bg-white px-6 text-base font-bold text-[#101217] hover:bg-white/85",
            )}
          >
            Plan a booking
            <Sparkles aria-hidden="true" />
          </BookButton>
        </ScrollReveal>
      </div>
    </section>
  );
}
