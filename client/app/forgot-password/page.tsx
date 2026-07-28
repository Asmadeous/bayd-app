import type { Metadata } from "next";

import { AuthPage } from "@/features/auth/components/auth-page";
import { authPages } from "@/features/auth/data";

export const metadata: Metadata = {
  title: "Reset Password | Beauty at Your Door",
  description:
    "Request password reset instructions for your Beauty at Your Door account.",
};

export default function ForgotPasswordPage() {
  return <AuthPage content={authPages.forgot} />;
}
