import { siteConfig } from "@/lib/site";

export type SocialPlatform = "Instagram" | "TikTok" | "Pinterest";

export type SocialPost = {
  id: string;
  title: string;
  caption: string;
  platform: SocialPlatform;
  category: "Before/After" | "Behind the Scenes" | "Education" | "Promo";
  image: {
    src: string;
    alt: string;
  };
  postUrl: string;
  publishedAt: string;
  featured: boolean;
};

export const socialPosts: SocialPost[] = [
  {
    id: "next-lash-inspiration",
    title: "Your next lash inspiration",
    caption:
      "A close-up lash result to help clients picture the shape, fullness, and finish they want.",
    platform: "Instagram",
    category: "Before/After",
    image: {
      src: "/images/social-posts/next-lash-inspiration.webp",
      alt: "BAYD social post showing lash inspiration close-up",
    },
    postUrl: siteConfig.socialLinks.instagram,
    publishedAt: "2026-09-17",
    featured: true,
  },
  {
    id: "the-lash-effect",
    title: "The lash effect",
    caption:
      "A branded look at the detail work behind a polished lash appointment.",
    platform: "Instagram",
    category: "Behind the Scenes",
    image: {
      src: "/images/social-posts/the-lash-effect.webp",
      alt: "BAYD social post titled The Lash Effect",
    },
    postUrl: siteConfig.socialLinks.instagram,
    publishedAt: "2026-09-16",
    featured: true,
  },
  {
    id: "beauty-precision",
    title: "Precision beauty perfection",
    caption:
      "A lash service moment designed around precision, comfort, and a polished finish.",
    platform: "Instagram",
    category: "Behind the Scenes",
    image: {
      src: "/images/social-posts/beauty-precision.webp",
      alt: "BAYD social post about precision beauty perfection",
    },
    postUrl: siteConfig.socialLinks.instagram,
    publishedAt: "2026-09-15",
    featured: true,
  },
  {
    id: "your-lashes-your-glow",
    title: "Your lashes, your glow",
    caption:
      "A reminder to keep lash appointments fresh before the fullness fades.",
    platform: "Instagram",
    category: "Promo",
    image: {
      src: "/images/social-posts/your-lashes-your-glow.webp",
      alt: "BAYD social post encouraging clients to book lash care",
    },
    postUrl: siteConfig.socialLinks.instagram,
    publishedAt: "2026-09-14",
    featured: false,
  },
  {
    id: "facials-o-clock",
    title: "Facials O'Clock",
    caption:
      "A bright booking prompt for facial services and self-care time.",
    platform: "Instagram",
    category: "Promo",
    image: {
      src: "/images/social-posts/facials-o-clock.webp",
      alt: "BAYD social post that says Facials O'Clock",
    },
    postUrl: siteConfig.socialLinks.instagram,
    publishedAt: "2026-09-12",
    featured: false,
  },
];

export const latestSocialPosts = socialPosts
  .filter((post) => post.featured)
  .slice(0, 3);
