import type { Metadata } from "next";

import { JobDetailPage } from "@/features/careers/components/job-detail-page";

type RouteProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Open Role | Beauty @ Your Door",
  description: "View this open role at Beauty @ Your Door and apply online.",
};

export default async function JobRoute({ params }: RouteProps) {
  const { slug } = await params;
  return <JobDetailPage slug={slug} />;
}
