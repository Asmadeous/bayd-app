import type { NextConfig } from "next";

// The customer mobile app (Capacitor) needs a static export in `out/`. Setting
// MOBILE_BUILD=1 switches to `output: "export"`; the normal web build stays
// `standalone` (server-rendered, for the Docker image). Two outputs, one codebase.
const isMobile = process.env.MOBILE_BUILD === "1";

const nextConfig: NextConfig = isMobile
  ? {
      output: "export",
      // Capacitor serves files from disk; the optimizer needs a server, so off.
      images: { unoptimized: true },
    }
  : {
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
