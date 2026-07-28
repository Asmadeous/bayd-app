import type { Metadata } from "next";

import { GalleryPage } from "@/features/gallery/components/gallery-page";

export const metadata: Metadata = {
  title: "Gallery | Beauty at Your Door",
  description:
    "Explore lash, nail, massage, pedicure, and waxing work from Beauty at Your Door mobile beauty appointments.",
};

export default function Gallery() {
  return <GalleryPage />;
}
