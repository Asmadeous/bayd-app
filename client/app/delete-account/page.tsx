import type { Metadata } from "next"
import Link from "next/link"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export const metadata: Metadata = {
  title: "Delete your account",
  description: "How to delete your Beauty @ Your Door account and what happens to your data.",
  alternates: { canonical: "/delete-account" },
}

// Public page for Google Play's account-deletion link: it has to explain the
// steps and what is erased or kept without the reader being signed in.
export default function DeleteAccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 text-[#14100F] md:py-20">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Delete your account</h1>
        <p className="mt-3 text-[#14100F]/70">
          You can delete your Beauty @ Your Door account at any time, from the app or the website.
        </p>

        <h2 className="mt-10 text-lg font-bold">In the app</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[#14100F]/80">
          <li>Open the BAYD app and sign in.</li>
          <li>Go to <strong>Profile</strong>.</li>
          <li>Tap <strong>Delete account</strong>, read what happens, type DELETE and confirm.</li>
        </ol>
        <p className="mt-2 text-sm text-[#14100F]/60">Staff use the same steps in the BAYD Staff app.</p>

        <h2 className="mt-8 text-lg font-bold">On the website</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[#14100F]/80">
          <li>
            <Link href="/signin" className="font-semibold text-[#9E4A60] underline underline-offset-2">
              Sign in
            </Link>
            .
          </li>
          <li>Go to <strong>Settings</strong> in your dashboard.</li>
          <li>Choose <strong>Delete account</strong> and confirm.</li>
        </ol>

        <h2 className="mt-8 text-lg font-bold">Can&apos;t sign in?</h2>
        <p className="mt-2 text-[#14100F]/80">
          Email{" "}
          <a href="mailto:Bookings@baydspa.ca" className="font-semibold text-[#9E4A60] underline underline-offset-2">
            Bookings@baydspa.ca
          </a>{" "}
          from the email address on your account and ask us to delete it.
        </p>

        <h2 className="mt-10 text-lg font-bold">What we erase</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[#14100F]/80">
          <li>Your name, email address, phone number and photo</li>
          <li>Your saved addresses and saved payment card</li>
          <li>Your messages, notifications, loyalty points and sign-in details</li>
        </ul>

        <h2 className="mt-8 text-lg font-bold">What we keep, and why</h2>
        <p className="mt-2 text-[#14100F]/80">
          Records of past bookings, payments and invoices (and, for staff, shifts and earnings) are kept without your
          name, email or phone on them, because Canadian tax law requires businesses to keep transaction records.
          Upcoming bookings are cancelled when you delete your account. If you paid for one, email us for a refund
          before you delete, since we can&apos;t contact you afterwards.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
