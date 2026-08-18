import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Beauty @ Your Door account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#f4f1eb] px-4 py-8 text-[#101217] sm:px-6">
      <div className="mx-auto w-full max-w-xl">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-sm font-extrabold text-[#5f6268] transition-colors hover:text-[#c96c83]"
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back home
        </Link>

        <Image
          alt="Beauty @ Your Door"
          className="mb-8 h-16 w-auto object-contain"
          height={936}
          priority
          src="/images/brand/bayd-logo-black.png"
          unoptimized
          width={3264}
        />
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#a36f4d]">Password help</p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Choose a new password.
        </h1>
        <p className="mt-4 text-base leading-7 text-[#5f6268]">
          This link works once and expires 15 minutes after it was sent.
        </p>

        <div className="mt-9">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
