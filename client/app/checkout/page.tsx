"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CreditCard } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCartStore } from "@/lib/stores/cart-store";
import api from "@/lib/api";
import { openHelcimPay } from "@/lib/helcim-pay";
import { cn } from "@/lib/utils";

// The backend creates the order + payment session. Depending on the gateway it
// returns either a Helcim checkout_token (we open the HelcimPay.js modal on this
// page) or a Square redirect_url (we send the browser there). No card data ever
// touches the browser app or our servers (PCI). Confirmation is authoritative
// via the payment webhook on the backend.
interface CheckoutResponse {
  gateway: "helcim" | "square";
  order_id: number;
  redirect_url?: string;
  checkout_token?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { items, clearCart } = useCartStore();
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace("/signup");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const subtotal = items.reduce(
    (total, item) => total + item.product.priceValue * item.quantity,
    0,
  );

  const { mutate: startCheckout, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.post<CheckoutResponse>("/checkout", {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      });
      return res.data;
    },
    onSuccess: async (data) => {
      setPayError(null);

      if (data.gateway === "square" && data.redirect_url) {
        clearCart();
        window.location.href = data.redirect_url; // Square hosted payment page
        return;
      }

      if (data.gateway === "helcim" && data.checkout_token) {
        try {
          const result = await openHelcimPay(data.checkout_token);
          if (result === "success") {
            // The webhook is authoritative; confirmation page polls order status.
            clearCart();
            router.push(`/checkout/confirmation?order=${data.order_id}`);
          } else if (result === "error") {
            setPayError("Payment could not be completed. Please try again.");
          }
          // "abort" — customer closed the modal; keep the cart, no error.
        } catch {
          setPayError("Could not open the payment window. Please try again.");
        }
        return;
      }

      setPayError("Checkout is not configured. Please contact support.");
    },
    onError: () => setPayError("Could not start checkout. Please try again."),
  });

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1760px] px-4 py-16 sm:px-6 lg:px-8 2xl:px-10">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm font-extrabold text-[#5f6268] transition-colors hover:text-[#c96c83]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to shop
        </Link>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.45fr]">
          {/* Order summary */}
          <section>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#101217]">
              Your order
            </h1>

            {items.length === 0 ? (
              <div className="mt-8 grid min-h-64 place-items-center border border-dashed border-black/20 bg-[#f4f1eb] p-8 text-center">
                <div>
                  <p className="text-xl font-extrabold text-[#101217]">
                    Your cart is empty.
                  </p>
                  <Link
                    href="/shop"
                    className={cn(
                      buttonVariants(),
                      "mt-6 h-11 px-6 text-sm font-bold",
                    )}
                  >
                    Browse products
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {items.map((item) => (
                  <article
                    key={item.product.id}
                    className="grid grid-cols-[5rem_1fr] gap-5 border border-black/10 bg-white p-4 shadow-sm"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#f4f1eb]">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                          {item.product.category}
                        </p>
                        <h3 className="mt-1 text-base font-extrabold text-[#101217]">
                          {item.product.name}
                        </h3>
                        <p className="mt-1 text-sm text-[#5f6268]">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-extrabold text-[#101217]">
                        CA$
                        {(item.product.priceValue * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Payment panel */}
          <aside className="h-fit border border-black/10 bg-[#f4f1eb] p-6 lg:sticky lg:top-24">
            <h2 className="text-2xl font-extrabold text-[#101217]">
              Order total
            </h2>

            <div className="mt-6 space-y-3 border-t border-black/10 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5f6268]">Subtotal</span>
                <span className="font-extrabold text-[#101217]">
                  CA${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f6268]">Tax (HST)</span>
                <span className="font-extrabold text-[#101217]">
                  CA${(subtotal * 0.13).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-black/10 pt-3 text-base">
                <span className="font-extrabold text-[#101217]">Total</span>
                <span className="font-extrabold text-[#101217]">
                  CA${(subtotal * 1.13).toFixed(2)}
                </span>
              </div>
            </div>

            {payError ? (
              <p className="mt-4 text-sm font-semibold text-red-600">{payError}</p>
            ) : null}

            <button
              type="button"
              disabled={isPending || items.length === 0}
              onClick={() => startCheckout()}
              className={cn(
                buttonVariants(),
                "mt-6 h-12 w-full text-base font-bold",
                isPending || items.length === 0
                  ? "pointer-events-none opacity-60"
                  : "",
              )}
            >
              {isPending ? "Preparing checkout..." : "Continue to payment"}
              <CreditCard aria-hidden="true" />
            </button>

            <p className="mt-4 text-center text-xs text-[#5f6268]">
              You&apos;ll complete payment securely via Helcim.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
