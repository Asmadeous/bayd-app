import type { Metadata } from "next";

import { GalleryPage } from "@/features/gallery/components/gallery-page";

export const metadata: Metadata = {
  title: "Gallery | Beauty @ Your Door",
  description:
    "Explore lash, nail, massage, pedicure, and waxing work from Beauty @ Your Door mobile beauty appointments.",
};

export default function Gallery() {
  return <GalleryPage />;
}
