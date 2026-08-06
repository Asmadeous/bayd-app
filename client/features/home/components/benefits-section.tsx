"use client";

import type { Benefit } from "@/features/home/types/home-content";
import { ScrollReveal } from "@/components/scroll-reveal";

type BenefitsSectionProps = {
  benefits: Benefit[];
};

export function BenefitsSection({ benefits }: BenefitsSectionProps) {
  return (
    <section className="bg-[#f4f1eb] py-24 text-[#101217]">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <ScrollReveal
            className="relative flex min-h-[520px] flex-col overflow-hidden bg-[#17110d] p-8 text-white sm:p-10 lg:min-h-[620px]"
            variant="fade-right"
          >
            <div className="absolute -bottom-20 -right-16 size-72 rounded-full bg-[#f0c8d3]/20 blur-3xl" />
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f0c8d3]">
              Why mobile
            </p>
            <h2 className="mt-5 max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Salon-level coordination without the salon commute.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/68">
              Beauty @ Your Door is built for appointments that feel calm,
              polished, and personal, whether it is one client at home or a full
              group event.
            </p>
            <div className="mt-auto grid gap-3 border-t border-white/15 pt-6 text-sm text-white/72 sm:grid-cols-2">
              <span>Private bookings</span>
              <span>Group-ready setup</span>
              <span>Mobile professionals</span>
              <span>Flexible service mixes</span>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit, index) => (
                <ScrollReveal
                  as="article"
                  className="relative min-h-56 overflow-hidden border border-black/10 bg-white/75 p-6 shadow-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-2xl hover:shadow-black/10"
                  delay={index * 70}
                  key={benefit.title}
                  variant={index % 2 === 0 ? "fade-left" : "fade-up"}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="relative mt-10 text-xl font-extrabold">
                    {benefit.title}
                  </h3>
                  <p className="relative mt-3 max-w-md text-sm leading-6 text-[#62666d]">
                    {benefit.description}
                  </p>
                </ScrollReveal>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
