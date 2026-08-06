import type { Metadata } from "next";

import { CareersPage } from "@/features/careers/components/careers-page";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the Beauty @ Your Door mobile beauty team. Browse open roles for beauty professionals and apply online.",
  alternates: {
    canonical: "/careers",
  },
};

export default function Careers() {
  return <CareersPage />;
}
