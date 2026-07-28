import type { Metadata } from "next";

import { TeamPage } from "@/features/team/components/team-page";

export const metadata: Metadata = {
  title: "Our Team | Beauty at Your Door",
  description:
    "Meet the mobile beauty professionals behind Beauty at Your Door. Browse technician profiles and read verified client reviews.",
};

export default function Team() {
  return <TeamPage />;
}
