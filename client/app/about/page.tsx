import type { Metadata } from "next";

import { AboutPage } from "@/features/about/components/about-page";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Meet the women-only mobile beauty team bringing nails, lashes, massage, pedicure, waxing, facials, and group beauty services across Toronto, Mississauga, Brampton, and the west end GTA.",
  alternates: {
    canonical: "/about",
  },
};

export default function About() {
  return <AboutPage />;
}
