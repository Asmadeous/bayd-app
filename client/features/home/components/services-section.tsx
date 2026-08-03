"use client";

import Image from "next/image";
import Link from "next/link";

import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "@/features/home/components/section-heading";

const serviceCategories = [
  {
    title: "Nails",
    description: "Manicures, extensions, refills, polish, and detailed finishes.",
    href: "/services#nails",
    image: "/images/nails1.jpg",
  },
  {
    title: "Lashes",
    description: "Classic, hybrid, volume, glam, and refill appointments.",
    href: "/services#lashes",
    image: "/images/lashes7.jpg",
  },
  {
    title: "Massage",
    description: "Relaxation, focused body work, and therapeutic options.",
    href: "/services#massages",
    image: "/images/massage.jpg",
  },
  {
    title: "Feet",
    description: "Pedicures, medical foot care, polish, and comfort treatments.",
    href: "/services#feet",
    image: "/images/Medicure1.jpg",
  },
  {
    title: "Waxing",
    description: "Face and body waxing arranged around your appointment.",
    href: "/services#waxing",
    image: "/images/nails7.jpg",
  },
  {
    title: "Facials",
    description: "Essential facials, targeted treatments, peels, and massage.",
    href: "/services#facials",
    image: "/images/lashes3.jpg",
  },
];

export function ServicesSection() {
  return (
    <section className="bg-background py-20" id="services">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            eyebrow="Services"
            title="Choose the kind of care you are looking for."
            description="Browse the main service categories here, then open the full directory for individual treatments, durations, and prices."
          />
        </ScrollReveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceCategories.map((category, index) => (
            <ScrollReveal
              delay={(index % 3) * 80}
              key={category.title}
              variant="scale-up"
            >
              <Link
                className="group block overflow-hidden border border-black/10 bg-white"
                href={category.href}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#e8dfd6]">
                  <Image
                    alt={`${category.title} services`}
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    src={category.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101217]/72 via-transparent to-transparent" />
                  <h3 className="absolute inset-x-0 bottom-0 p-5 text-3xl font-extrabold text-white">
                    {category.title}
                  </h3>
                </div>
                <p className="min-h-24 p-5 text-sm leading-6 text-[#5f6268]">
                  {category.description}
                </p>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-8 border-t border-black/10 pt-7">
          <Link
            className="inline-flex h-12 items-center justify-center bg-[#101217] px-6 text-sm font-bold text-white transition-colors hover:bg-[#c96c83]"
            href="/services"
          >
            View all services and prices
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
