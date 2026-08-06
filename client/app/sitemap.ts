import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

const routes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "about", changeFrequency: "monthly", priority: 0.75 },
  { path: "services", changeFrequency: "weekly", priority: 0.95 },
  { path: "gallery", changeFrequency: "weekly", priority: 0.7 },
  { path: "shop", changeFrequency: "weekly", priority: 0.65 },
  { path: "blog", changeFrequency: "weekly", priority: 0.65 },
  { path: "careers", changeFrequency: "monthly", priority: 0.55 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: route.path ? `${siteConfig.url}/${route.path}` : siteConfig.url,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
