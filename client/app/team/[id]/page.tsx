import type { Metadata } from "next";

import { TeamMemberPage } from "@/features/team/components/team-member-page";

type TeamMemberRouteProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Team Member",
  description:
    "View this Beauty @ Your Door technician's profile, services, and verified client reviews.",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function TeamMember({ params }: TeamMemberRouteProps) {
  const { id } = await params;
  return <TeamMemberPage id={id} />;
}
