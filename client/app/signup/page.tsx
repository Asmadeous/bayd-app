import type { Metadata } from "next";

import { AuthPage } from "@/features/auth/components/auth-page";
import { authPages } from "@/features/auth/data";

export const metadata: Metadata = {
  title: "Create Account | Beauty at Your Door",
  description:
    "Create a Beauty at Your Door account for bookings, products, and loyalty notes.",
};

export default function SignUpPage() {
  return <AuthPage content={authPages.signup} />;
}
