"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { useCartStore } from "@/lib/stores/cart-store";
import { cn } from "@/lib/utils";

export default function CheckoutConfirmationPage() {
  const { clearCart } = useCartStore();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1760px] px-4 py-24 sm:px-6 lg:px-8 2xl:px-10">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex size-20 items-center justify-center bg-[#f4f1eb]">
            <CheckCircle2 className="size-10 text-[#c96c83]" aria-hidden="true" />
          </div>
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-[#101217]">
            Order confirmed
          </h1>
          <p className="mt-4 text-base leading-7 text-[#5f6268]">
            Thank you for your purchase. Your payment was processed successfully
            through Square. You will receive a confirmation email shortly.
          </p>

          <div className="mt-10 grid gap-3 border border-black/10 bg-[#f4f1eb] p-6 text-left">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              What happens next
            </p>
            <p className="text-sm leading-6 text-[#5f6268]">
              Our team will review your order and reach out to confirm delivery
              or pickup details. If you also have a service booking, check your
              dashboard for the status.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard/customer/book"
              className={cn(buttonVariants(), "h-12 px-6 text-base font-bold")}
            >
              Book a service
            </Link>
            <Link
              href="/shop"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 border-black/20 bg-white/70 px-6 text-base hover:bg-white",
              )}
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
