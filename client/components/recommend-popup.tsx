"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, X } from "lucide-react";

import api from "@/lib/api";
import { cn } from "@/lib/utils";

// "Out of sight, out of mind" — a small dismissible card that slides in from the
// bottom corner and rotates through top-selling products to nudge shoppers while
// they browse. Ranked server-side by real sales (with fallbacks). Auto-rotates.

interface TopSeller {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
  category: string | null;
}

const ROTATE_MS = 22_000; // swap to a new product every ~22s
const FIRST_SHOW_MS = 8_000; // wait a bit before the first appearance

export function RecommendPopup() {
  const { data } = useQuery<{ data: TopSeller[] }>({
    queryKey: ["top-sellers"],
    queryFn: () =>
      api.get<{ data: TopSeller[] }>("/products/top_sellers?limit=8").then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const products = data?.data ?? [];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // First reveal after a short delay so it doesn't slam the user on load.
  useEffect(() => {
    if (dismissed || products.length === 0) return;
    const t = window.setTimeout(() => setVisible(true), FIRST_SHOW_MS);
    return () => window.clearTimeout(t);
  }, [dismissed, products.length]);

  // Rotate to the next product on an interval. Re-show if it was auto-hidden.
  useEffect(() => {
    if (dismissed || products.length === 0) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % products.length);
      setVisible(true);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [dismissed, products.length]);

  if (dismissed || products.length === 0) return null;
  const product = products[index];
  if (!product) return null;

  return (
    <div
      aria-live="polite"
      className={cn(
        "fixed bottom-4 left-4 z-40 w-[19rem] max-w-[calc(100vw-6rem)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:bottom-6 sm:left-6",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <div className="relative overflow-hidden border border-black/10 bg-white shadow-2xl shadow-black/15">
        <button
          aria-label="Dismiss recommendation"
          className="absolute right-2 top-2 z-10 grid size-7 place-items-center bg-white/80 text-[#101217] transition-colors hover:bg-[#101217] hover:text-white"
          onClick={() => setDismissed(true)}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <Link
          className="flex items-stretch gap-3"
          href="/shop"
          onClick={() => setVisible(false)}
        >
          <div className="relative size-24 shrink-0 overflow-hidden bg-[#f4f1eb]">
            <Image
              src={product.image_url ?? "/images/lashes1.jpg"}
              alt={product.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center py-3 pr-8">
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-[#a36f4d]">
              Top seller
            </p>
            <h3 className="mt-1 truncate text-sm font-extrabold text-[#101217]">
              {product.name}
            </h3>
            <p className="mt-1 text-sm font-extrabold">${Number(product.price).toFixed(2)}</p>
            <span className="mt-2 inline-flex w-fit items-center gap-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#c96c83]">
              <ShoppingBag aria-hidden="true" className="size-3" />
              Shop now
            </span>
          </div>
        </Link>

        {/* Rotation progress hint — a thin bar that refills each cycle. */}
        <div className="h-0.5 w-full bg-black/5">
          <div
            className="h-full bg-[#c96c83]"
            key={index}
            style={{ animation: `recommend-progress ${ROTATE_MS}ms linear` }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes recommend-progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
