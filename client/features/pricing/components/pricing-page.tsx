import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Clock, MapPin, Phone } from "lucide-react";

import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { BookButton } from "@/components/ui/book-button";
import type { PriceCategory } from "@/features/pricing/types";
import { cn } from "@/lib/utils";

const bookingNotes = [
  "Minimum $50 service purchase required to book an appointment.",
  "Nail art is not included in listed nail prices.",
  "Final timing can vary by service mix, travel needs, and group size.",
];

export function PricingPage({ categories }: { categories: PriceCategory[] }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <PricingHero categories={categories} />
        <PriceDirectory categories={categories} />
        <BookingStrip />
      </main>
      <SiteFooter />
    </div>
  );
}

function PricingHero({ categories }: { categories: PriceCategory[] }) {
  return (
    <section className="overflow-hidden bg-[#f4f1eb] text-[#101217]">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-20 lg:pt-16 2xl:px-10">
        <div className="flex min-h-[520px] flex-col justify-between">
          <ScrollReveal variant="fade-right">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
              Service Prices
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Simple pricing for beauty at home.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a] sm:text-lg">
              Browse starting prices for mobile nails, massage, feet, waxing,
              and lashes across Ontario. Choose one service or combine a few
              into a private booking.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                  "h-12 border-black/20 bg-white/70 px-6 text-base hover:bg-white",
                )}
                href="tel:+14165550198"
              >
                Call to book
                <Phone aria-hidden="true" />
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal
            className="mt-10 grid gap-3 border-t border-black/10 pt-6 text-sm text-[#4f535a] sm:grid-cols-3"
            delay={120}
            variant="fade-up"
          >
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 text-[#a36f4d]" />
              Mobile service
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock aria-hidden="true" className="size-4 text-[#a36f4d]" />
              Flexible timing
            </span>
            <span className="inline-flex items-center gap-2">
              <Check aria-hidden="true" className="size-4 text-[#a36f4d]" />
              Group-ready
            </span>
          </ScrollReveal>
        </div>

        <div className="grid gap-4 self-end md:grid-cols-3">
          {categories.slice(0, 3).map((category, index) => (
            <ScrollReveal
              as="article"
              className={cn(
                "relative min-h-56 overflow-hidden border border-black/10 p-6 text-[#101217] shadow-sm",
                category.accent,
                index === 1 ? "md:-translate-y-8" : "",
              )}
              delay={index * 100}
              key={category.id}
              variant="scale-up"
            >
              <p className="text-2xl font-extrabold tracking-tight">
                {category.title}
              </p>
              {category.summary && (
                <p className="mt-2 max-w-[12rem] text-sm leading-5 text-[#101217]/70">
                  {category.summary}
                </p>
              )}
              <p className="mt-7 text-4xl font-extrabold">
                {category.items[0]?.price}
                <span className="ml-1 text-sm font-bold text-[#101217]/60">
                  start
                </span>
              </p>
            </ScrollReveal>
          ))}
          <ScrollReveal
            className="relative min-h-72 overflow-hidden md:col-span-3"
            delay={220}
            variant="clip-up"
          >
            <Image
              src="/images/lashes3.jpg"
              alt="Before and after lash extension result"
              fill
              sizes="(min-width: 1024px) 54vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,18,23,0.82),rgba(16,18,23,0.24)_55%,rgba(16,18,23,0.05))]" />
            <div className="absolute bottom-6 left-6 right-6 max-w-xl text-white">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#f0c8d3]">
                Custom packages
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight">
                Build a calm, coordinated beauty appointment at home.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function PriceDirectory({ categories }: { categories: PriceCategory[] }) {
  return (
    <section className="bg-[#f4f1eb] py-20 text-[#101217]" id="price-directory">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <ScrollReveal
            className="h-fit border border-black/10 bg-white/70 p-6 lg:sticky lg:top-24"
            variant="fade-right"
          >
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Clear service prices, arranged for quick scanning.
            </h2>
            <div className="mt-7 space-y-4">
              {bookingNotes.map((note) => (
                <p
                  className="border-t border-black/10 pt-4 text-sm leading-6 text-[#5f6268]"
                  key={note}
                >
                  {note}
                </p>
              ))}
            </div>
          </ScrollReveal>

          <div className="grid gap-4 xl:grid-cols-2">
            {categories.map((category, index) => (
              <ScrollReveal
                as="article"
                className={cn(
                  "border border-black/10 bg-white p-5 shadow-sm",
                  category.id === "nails" ? "xl:row-span-2" : "",
                )}
                delay={(index % 2) * 80}
                key={category.id}
                variant="fade-up"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a36f4d]">
                      {category.id}
                    </p>
                    <h3 className="mt-2 text-3xl font-extrabold tracking-[0.08em]">
                      {category.title}
                    </h3>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  {category.items.map((item) => (
                    <div
                      className="grid grid-cols-[auto_1fr_auto] items-baseline gap-2 text-sm"
                      key={`${category.id}-${item.name}-${item.price}`}
                    >
                      <span className="min-w-0 font-medium text-[#101217]">
                        {item.name}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-px border-b border-dotted border-[#df8d72]/70"
                      />
                      <span className="font-extrabold text-[#101217]">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BookingStrip() {
  return (
    <section className="bg-background py-18">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal className="grid gap-6 bg-[#101217] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f0c8d3]">
              Ready to book
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Tell us the services, date, and location. We will help shape the
              appointment.
            </h2>
          </div>
          <BookButton
            className={cn(
              buttonVariants(),
              "h-12 bg-white px-6 text-base font-bold text-[#101217] hover:bg-white/85",
            )}
          >
            Plan a booking
            <ArrowUpRight aria-hidden="true" />
          </BookButton>
        </ScrollReveal>
      </div>
    </section>
  );
}
