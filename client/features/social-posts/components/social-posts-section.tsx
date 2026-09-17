"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import { ScrollReveal } from "@/components/scroll-reveal";
import {
  latestSocialPosts,
  socialPosts,
  type SocialPost,
} from "@/features/social-posts/data";
import { cn } from "@/lib/utils";

type SocialPostsSectionProps = {
  context: "home" | "gallery";
};

export function SocialPostsSection({ context }: SocialPostsSectionProps) {
  const isHome = context === "home";
  const posts = isHome ? latestSocialPosts : socialPosts;

  return (
    <section
      className={cn(
        "overflow-hidden text-[#101217]",
        isHome ? "bg-background py-24" : "bg-[#f4f1eb] py-20",
      )}
    >
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal className="grid gap-6 border-b border-black/10 pb-9 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#a36f4d]">
              {isHome ? "Latest from BAYD" : "From Our Socials"}
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              {isHome
                ? "A few moments from our beauty feed."
                : "Social updates, service moments, and beauty notes."}
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[#5f6268]">
            {isHome
              ? "A small preview of the posts our team shares across BAYD social channels."
              : "Curated posts live separately from the work gallery so service results stay clear while social content has room to breathe."}
          </p>
        </ScrollReveal>

        <div
          className={cn(
            "mt-10 grid gap-4",
            isHome
              ? "md:grid-cols-3"
              : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          )}
        >
          {posts.map((post, index) => (
            <SocialPostCard
              delay={index * 70}
              key={post.id}
              post={post}
              priority={isHome && index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialPostCard({
  delay,
  post,
  priority,
}: {
  delay: number;
  post: SocialPost;
  priority?: boolean;
}) {
  return (
    <ScrollReveal
      as="article"
      className="group overflow-hidden bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10"
      delay={delay}
      variant="scale-up"
    >
      <a
        className="block"
        href={post.postUrl}
        rel="noreferrer"
        target="_blank"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[#e8dfd6]">
          <Image
            alt={post.image.alt}
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
            src={post.image.src}
            unoptimized
          />
          <div className="absolute left-4 top-4 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#101217]">
            {post.platform}
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
            {post.category}
          </p>
          <h3 className="mt-3 text-xl font-extrabold tracking-tight">
            {post.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#62666d]">
            {post.caption}
          </p>
          <span className="mt-6 inline-flex items-center text-sm font-extrabold text-[#101217] transition-colors group-hover:text-[#c96c83]">
            View post
            <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
          </span>
        </div>
      </a>
    </ScrollReveal>
  );
}
