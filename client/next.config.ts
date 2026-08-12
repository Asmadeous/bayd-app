import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server build for a small Docker runtime image.
  output: "standalone",
  images: {
    qualities: [75, 96, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
    ],
  },
};

export default nextConfig;
