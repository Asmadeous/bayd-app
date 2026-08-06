"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { ArrowUpRight, Clock, Star } from "lucide-react";

import type { Service } from "@/features/home/types/home-content";

type ServiceCardProps = {
  isFeatured?: boolean;
  onSelect: (service: Service, event: MouseEvent<HTMLButtonElement>) => void;
  service: Service;
};

export function ServiceCard({
  isFeatured = false,
  onSelect,
  service,
}: ServiceCardProps) {
  return (
    <button
      className={`group h-full w-full overflow-hidden border border-black/10 bg-white text-left transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10 ${
        isFeatured ? "md:col-span-3 md:grid md:grid-cols-[1.25fr_0.75fr]" : ""
      }`}
      onClick={(event) => onSelect(service, event)}
      type="button"
    >
      <span
        className={`relative block overflow-hidden ${
          isFeatured ? "aspect-[16/8] md:aspect-auto md:min-h-[420px]" : "aspect-[4/3]"
        }`}
      >
        <Image
          src={service.image.src}
          alt={service.image.alt}
          fill
          sizes={isFeatured ? "100vw" : "(min-width: 768px) 33vw, 100vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <span className="absolute right-5 top-5 grid size-11 place-items-center bg-white text-[#101217] transition-transform group-hover:rotate-45">
          <ArrowUpRight aria-hidden="true" className="size-5" />
        </span>
      </span>
      <span className="block p-5 sm:p-6">
        <span className="flex flex-wrap items-center gap-3 text-sm font-bold text-[#6a6260]">
          {service.rating && (
            <span className="inline-flex items-center gap-1.5">
              <Star aria-hidden="true" className="size-4 fill-current" />
              {service.rating}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            {service.duration}
          </span>
          <span>{service.price}</span>
        </span>
        <span className="mt-4 block text-2xl font-extrabold tracking-tight text-[#101217]">
          {service.title}
        </span>
        <span className="mt-3 block max-w-2xl text-sm leading-6 text-muted-foreground">
          {service.description}
        </span>
      </span>
    </button>
  );
}
