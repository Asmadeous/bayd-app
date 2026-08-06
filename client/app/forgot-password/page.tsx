import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthPage } from "@/features/auth/components/auth-page";
import { authPages } from "@/features/auth/data";

export const metadata: Metadata = {
  title: "Reset Password | Beauty @ Your Door",
  description:
    "Request password reset instructions for your Beauty @ Your Door account.",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AuthPage content={authPages.forgot} />
    </Suspense>
  );
}
