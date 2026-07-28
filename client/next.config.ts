import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server build for a small Docker runtime image.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
      },
    ],
  },
};

export default nextConfig;
