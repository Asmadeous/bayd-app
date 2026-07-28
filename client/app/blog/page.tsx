import type { Metadata } from "next";

import { BlogPage } from "@/features/blog/components/blog-page";
import type {
  BlogGuide,
  BlogPost,
} from "@/features/blog/types/blog-content";

export const metadata: Metadata = {
  title: "Beauty Journal | Beauty at Your Door",
  description:
    "Beauty service prep guides, aftercare notes, product pairings, and spa party ideas from Beauty at Your Door.",
};

interface ApiBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  author_name: string | null;
  read_time: string;
}

const GUIDES: BlogGuide[] = [
  { title: "Appointment Prep", description: "What to set up before your provider arrives." },
  { title: "Aftercare", description: "How to protect your results between bookings." },
  { title: "Events", description: "Ideas for birthdays, bridal mornings, and group days." },
  { title: "Shop Notes", description: "Product pairings for lashes, nails, feet, and body care." },
];

function mapApiBlogPost(p: ApiBlogPost): BlogPost {
  return {
    id: p.slug,
    title: p.title,
    category: "Beauty Tips",
    excerpt: p.excerpt ?? p.title,
    image: {
      src: p.cover_image_url ?? "/images/lashes1.jpg",
      alt: p.title,
    },
    readTime: p.read_time ?? "3 min read",
    publishedAt: p.published_at
      ? new Date(p.published_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Recent",
    author: p.author_name ?? "Beauty at Your Door",
    href: `/blog/${p.slug}`,
    body: p.body ?? undefined,
  };
}

export default async function Blog() {
  const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

  const res = await fetch(`${BASE_URL}/blog_posts`, {
    next: { revalidate: 60 },
  });

  const apiPosts: ApiBlogPost[] = res.ok ? ((await res.json()).data ?? []) : [];
  const posts = apiPosts.map(mapApiBlogPost);

  return (
    <BlogPage
      content={{
        featuredPost: posts[0] ?? null,
        posts: posts.slice(1),
        guides: GUIDES,
      }}
    />
  );
}
