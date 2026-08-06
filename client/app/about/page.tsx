import type { Metadata } from "next";

import { AboutPage } from "@/features/about/components/about-page";

export const metadata: Metadata = {
  title: "About Us | Beauty @ Your Door",
  description:
    "Meet the experienced mobile beauty team bringing nails, lashes, massage, pedicure, waxing, and group beauty services across the GTA.",
};

export default function About() {
  return <AboutPage />;
}
