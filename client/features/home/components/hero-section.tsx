"use client";

import { ArrowUpRight, ShoppingCart } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { BookButton } from "@/components/ui/book-button";
import { HeroCollageMarquee } from "@/features/home/components/hero-collage-marquee";
import { HeroHeadline } from "@/features/home/components/hero-headline";
import { HeroOrbitCta } from "@/features/home/components/hero-orbit-cta";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="overflow-hidden bg-[#f4f1eb]">
      <div className="mx-auto w-full max-w-[1760px] px-4 pb-14 pt-8 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex items-start justify-between gap-8">
          <HeroHeadline />
          <HeroOrbitCta />
        </div>
        <div className="mt-5 max-w-4xl">
          <p className="text-base leading-7 text-[#4f535a] sm:text-lg">
            Mobile lashes, massage, nail tech, pedicure, manicure, and event
            beauty services designed for polished appointments at home, work,
            or private gatherings.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <BookButton
            className={cn(
              buttonVariants(),
              "h-12 px-6 text-base font-bold",
            )}
          >
            Book a service
            <ArrowUpRight aria-hidden="true" />
          </BookButton>
          <a
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-12 border-black/20 bg-white/70 px-6 text-base",
            )}
            href="/shop"
          >
            Shop
            <ShoppingCart aria-hidden="true" />
          </a>
        </div>

        <HeroCollageMarquee />
      </div>
    </section>
  );
}
