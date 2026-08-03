"use client";

import Image from "next/image";
import { Check } from "lucide-react";

import { SectionHeading } from "@/features/home/components/section-heading";

const partyDetails = [
  "Birthday spa days",
  "Bridal party mornings",
  "Corporate wellness events",
  "Private girls' nights",
];

export function PartySection() {
  return (
    <section className="bg-[#faf7f3] py-20" id="parties">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 2xl:px-10">
        <div className="relative min-h-[430px] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1400&auto=format&fit=crop"
            alt="A relaxed spa party table with beauty products and towels"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-center">
          <SectionHeading
            eyebrow="Spa parties"
            title="Turn a private gathering into a calm, polished experience."
            description="Choose the services, guest count, and setting. The mobile team plans the rhythm of the booking so guests can rotate through treatments without the day feeling rushed."
          />

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {partyDetails.map((detail) => (
              <div
                className="flex items-center gap-3 border border-black/10 bg-white p-3 text-sm font-medium"
                key={detail}
              >
                <Check aria-hidden="true" className="size-4 text-[#a36f4d]" />
                {detail}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
