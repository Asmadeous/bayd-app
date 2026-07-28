import type { Metadata } from "next";

import { CareersPage } from "@/features/careers/components/careers-page";

export const metadata: Metadata = {
  title: "Careers | Beauty at Your Door",
  description:
    "Join the Beauty at Your Door mobile beauty team. Browse open roles and apply online.",
};

export default function Careers() {
  return <CareersPage />;
}
