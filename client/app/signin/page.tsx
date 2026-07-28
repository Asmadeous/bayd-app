import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthPage } from "@/features/auth/components/auth-page";
import { authPages } from "@/features/auth/data";

export const metadata: Metadata = {
  title: "Sign In | Beauty at Your Door",
  description:
    "Sign in to manage Beauty at Your Door bookings, products, and account preferences.",
};

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <AuthPage content={authPages.signin} />
    </Suspense>
  );
}
