"use client";

import Image from "next/image";

import { ScrollReveal } from "@/components/scroll-reveal";
import { partners } from "@/features/partners/data";

export function PartnersSection() {
  return (
    <section className="overflow-hidden bg-[#f4f1eb] py-20 text-[#101217]">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal>
          <h2 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            BAYD partners with trusted beauty brands to support your skin care
            and makeup routine.
          </h2>
        </ScrollReveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {partners.map((partner, index) => (
            <a
              className="group block"
              href={partner.url}
              key={partner.name}
              rel="noreferrer"
              target="_blank"
            >
              <ScrollReveal
                className="flex h-24 items-center justify-center bg-white px-8 shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/10 sm:h-28"
                delay={index * 80}
                variant="scale-up"
              >
                <Image
                  alt={`${partner.name} logo`}
                  className="max-h-14 w-full max-w-52 object-contain"
                  height={partner.logoHeight}
                  src={partner.logoSrc}
                  unoptimized
                  width={partner.logoWidth}
                />
              </ScrollReveal>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
