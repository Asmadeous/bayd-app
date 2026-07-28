import type { BlogPageContent } from "@/features/blog/types/blog-content";

const posts = [
  {
    id: "lash-appointment-prep",
    title: "How to prep for a lash appointment at home",
    category: "Lashes",
    excerpt:
      "A calm setup, clean skin, and a few simple timing choices can help your lash service feel smoother from arrival to final brush-through.",
    image: {
      src: "/images/lashes2.jpg",
      alt: "Client relaxing during a lash service with under-eye pads",
    },
    readTime: "5 min read",
    publishedAt: "Jun 4, 2026",
    author: "Beauty at Your Door",
    href: "/blog/lash-appointment-prep",
  },
  {
    id: "pedicure-aftercare",
    title: "Pedicure aftercare for softer feet between visits",
    category: "Feet",
    excerpt:
      "Small daily habits can help preserve the smooth finish from your pedicure and make your next appointment easier on your skin.",
    image: {
      src: "/images/pedicure1.jpg",
      alt: "Client receiving a relaxing pedicure service",
    },
    readTime: "4 min read",
    publishedAt: "May 28, 2026",
    author: "Beauty at Your Door",
    href: "/blog/pedicure-aftercare",
  },
  {
    id: "spa-party-planning",
    title: "What to plan before hosting a spa party",
    category: "Events",
    excerpt:
      "Guest count, service timing, room flow, and refreshment breaks shape whether a group beauty day feels organized or rushed.",
    image: {
      src: "/images/lashes4.jpg",
      alt: "Beauty detail image for group service planning",
    },
    readTime: "6 min read",
    publishedAt: "May 21, 2026",
    author: "Beauty at Your Door",
    href: "/blog/spa-party-planning",
  },
  {
    id: "manicure-home-setup",
    title: "The best home setup for a mobile manicure",
    category: "Nails",
    excerpt:
      "Good lighting, a sturdy surface, and a little table space help your nail tech work cleanly and keep the appointment comfortable.",
    image: {
      src: "/images/Medicure1.jpg",
      alt: "Manicure service with a nail technician using an electric file",
    },
    readTime: "3 min read",
    publishedAt: "May 14, 2026",
    author: "Beauty at Your Door",
    href: "/blog/manicure-home-setup",
  },
  {
    id: "lash-aftercare-kit",
    title: "What belongs in a lash aftercare kit",
    category: "Aftercare",
    excerpt:
      "Cleanser, a soft brush, and a fresh spoolie are the core tools for keeping extensions tidy without overcomplicating the routine.",
    image: {
      src: "/images/lashes1.jpg",
      alt: "Close-up lash image used for aftercare guidance",
    },
    readTime: "4 min read",
    publishedAt: "May 7, 2026",
    author: "Beauty at Your Door",
    href: "/blog/lash-aftercare-kit",
  },
];

export function getBlogPageContent(): BlogPageContent {
  return {
    featuredPost: posts[0],
    posts: posts.slice(1),
    guides: [
      {
        title: "Appointment Prep",
        description: "What to set up before your provider arrives.",
      },
      {
        title: "Aftercare",
        description: "How to protect your results between bookings.",
      },
      {
        title: "Events",
        description: "Ideas for birthdays, bridal mornings, and group days.",
      },
      {
        title: "Shop Notes",
        description: "Product pairings for lashes, nails, feet, and body care.",
      },
    ],
  };
}

export function getAllBlogPosts() {
  return posts;
}

export function getBlogPost(slug: string) {
  return posts.find((post) => post.id === slug);
}
