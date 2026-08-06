import type { Metadata } from "next";

import { GalleryPage } from "@/features/gallery/components/gallery-page";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Explore lash, nail, massage, pedicure, waxing, facial, and mobile beauty appointment work from Beauty @ Your Door.",
  alternates: {
    canonical: "/gallery",
  },
};

export default function Gallery() {
  return <GalleryPage />;
}
