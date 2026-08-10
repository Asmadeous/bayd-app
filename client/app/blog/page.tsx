import type { Metadata } from "next";

import { BlogPage } from "@/features/blog/components/blog-page";
import { API_BASE_URL } from "@/lib/config";
import type {
  BlogGuide,
  BlogPost,
} from "@/features/blog/types/blog-content";

export const metadata: Metadata = {
  title: "Beauty Journal",
  description:
    "Mobile beauty service prep guides, aftercare notes, product pairings, and spa party ideas from Beauty @ Your Door.",
  alternates: {
    canonical: "/blog",
  },
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
  category: string | null;
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
    category: p.category ?? "Beauty Tips",
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
    author: p.author_name ?? "Beauty @ Your Door",
    href: `/blog/${p.slug}`,
    body: p.body ?? undefined,
  };
}

export default async function Blog() {
  let apiPosts: ApiBlogPost[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/blog_posts`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      apiPosts = data.data ?? [];
    }
  } catch {
    apiPosts = [];
  }
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
