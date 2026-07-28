export type BlogPost = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  image: {
    src: string;
    alt: string;
  };
  readTime: string;
  publishedAt: string;
  author: string;
  href: string;
  body?: string;
};

export type BlogGuide = {
  title: string;
  description: string;
};

export type BlogPageContent = {
  featuredPost: BlogPost | null;
  posts: BlogPost[];
  guides: BlogGuide[];
};
