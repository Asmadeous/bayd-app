import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogArticlePage } from "@/features/blog/components/blog-article-page";
import { API_BASE_URL } from "@/lib/config";
import type { BlogPost } from "@/features/blog/types/blog-content";

type BlogArticleRouteProps = {
  params: Promise<{ slug: string }>;
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
    author: p.author_name ?? "Beauty @ Your Door",
    href: `/blog/${p.slug}`,
    body: p.body ?? undefined,
  };
}

async function fetchPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/blog_posts/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return mapApiBlogPost(await res.json());
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: BlogArticleRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) return { title: "Blog Article" };

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${slug}`,
      images: [
        {
          url: post.image.src,
          alt: post.image.alt,
        },
      ],
    },
  };
}

export default async function BlogArticle({ params }: BlogArticleRouteProps) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) notFound();

  return <BlogArticlePage post={post} />;
}
