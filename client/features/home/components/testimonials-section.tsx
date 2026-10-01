"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, MapPin, Star } from "lucide-react";

import { ScrollReveal } from "@/components/scroll-reveal";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type Testimonial = {
  name: string;
  context: string;
  location?: string;
  quote: string;
  service: string;
  rating?: number;
  image: { src: string; alt: string };
};

interface PublicReview {
  id: number;
  rating: number;
  body: string | null;
  reviewer_name: string;
  technician_name: string | null;
  service_name: string | null;
}

// Real client reviews have no photo, so each gets one of the section's service
// photos, picked by the service they reviewed.
function reviewImage(service: string | null, index: number) {
  const s = (service ?? "").toLowerCase();
  if (s.includes("lash")) return { src: "/images/lashes2.jpg", alt: "Client relaxing during a lash service" };
  if (s.includes("pedicure") || s.includes("feet")) return { src: "/images/pedicure1.jpg", alt: "Client receiving a pedicure" };
  const rotation = sampleTestimonials.map((t) => t.image);
  return rotation[index % rotation.length];
}

function toTestimonial(review: PublicReview, index: number): Testimonial {
  return {
    name: review.reviewer_name,
    context: review.technician_name ? `With ${review.technician_name}` : "Verified client",
    quote: review.body ?? "",
    service: review.service_name ?? "Beauty @ Your Door",
    rating: review.rating,
    image: reviewImage(review.service_name, index),
  };
}

// Shown only until approved client reviews exist.
const sampleTestimonials: Testimonial[] = [
  {
    name: "Maya R.",
    context: "Lash refill at home",
    location: "Mississauga",
    quote:
      "The whole appointment felt calm and professional. My lashes looked soft, full, and exactly like the reference I shared.",
    service: "Lashes",
    image: {
      src: "/images/lashes2.jpg",
      alt: "Client relaxing during a lash service with under-eye pads",
    },
  },
  {
    name: "Tania B.",
    context: "Birthday spa party",
    location: "Brampton",
    quote:
      "They helped us plan the timing, set up beautifully, and kept every guest moving without making the day feel rushed.",
    service: "Events",
    image: {
      src: "/images/lashes4.jpg",
      alt: "Beauty detail image representing an event-ready service",
    },
  },
  {
    name: "Elena M.",
    context: "Pedicure and manicure",
    location: "Toronto",
    quote:
      "It was so convenient having everything done at home. The setup was clean, the finish was polished, and the aftercare advice helped.",
    service: "Nails and feet",
    image: {
      src: "/images/pedicure1.jpg",
      alt: "Client receiving a relaxing pedicure service",
    },
  },
];

export function TestimonialsSection() {
  const { data: reviews } = useQuery({
    queryKey: ["public-reviews", "testimonials"],
    queryFn: () => api.get<{ data: PublicReview[] }>("/reviews", { params: { per_page: 10 } }).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
  // Approved reviews with written feedback (featured first, from the API).
  const testimonials = useMemo(() => {
    const real = (reviews ?? []).filter((r) => r.body?.trim()).map(toTestimonial);
    return real.length > 0 ? real : sampleTestimonials;
  }, [reviews]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTestimonial = testimonials[activeIndex % testimonials.length];
  const count = testimonials.length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % count);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [count]);

  function showPrevious() {
    setActiveIndex((currentIndex) => (currentIndex - 1 + count) % count);
  }

  function showNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % count);
  }

  return (
    <section className="overflow-hidden bg-[#101217] text-white">
      <ScrollReveal
        as="article"
        className="relative isolate min-h-[680px] overflow-hidden bg-[#101217] shadow-2xl shadow-black/25 sm:min-h-[720px] lg:min-h-[760px]"
        variant="clip-up"
      >
        {testimonials.map((testimonial, index) => (
          <Image
            alt={testimonial.image.alt}
            className={cn(
              "-z-30 object-cover transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
              index === activeIndex % count
                ? "scale-100 opacity-100"
                : "scale-105 opacity-0",
            )}
            fill
            key={`${testimonial.name}-${index}`}
            priority={index === 0}
            sizes="100vw"
            src={testimonial.image.src}
          />
        ))}

        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(16,18,23,0.82),rgba(16,18,23,0.28)_52%,rgba(16,18,23,0.06))]" />
        <div className="absolute inset-x-0 bottom-0 -z-20 h-2/3 bg-[linear-gradient(180deg,transparent,rgba(16,18,23,0.74))]" />

        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="relative flex min-h-[680px] flex-col justify-between py-5 sm:min-h-[720px] sm:py-7 lg:min-h-[760px] lg:py-8">
            <div className="max-w-5xl">
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                <span className="grid size-8 place-items-center border border-white/75 text-sm">
                  {(activeIndex % count) + 1}
                </span>
                Why clients love
              </p>
              <h2 className="mt-2 max-w-4xl text-5xl font-black italic leading-[0.9] tracking-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)] sm:text-7xl lg:text-8xl">
                <span className="sr-only">Beauty @ Your Door</span>
                <Image
                  alt=""
                  aria-hidden="true"
                  className="mt-3 h-24 w-auto object-contain drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)] sm:h-32 lg:h-40"
                  height={936}
                  src="/images/brand/bayd-logo-white.png"
                  unoptimized
                  width={3264}
                />
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_minmax(25rem,34rem)] lg:items-end">
              <div aria-hidden="true" className="hidden lg:block" />

              <div className="bg-white p-5 text-[#101217] shadow-2xl shadow-black/20 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a36f4d]">
                    {activeTestimonial.service}
                  </p>
                  <div className="flex gap-1 text-[#c96c83]">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star
                        aria-hidden="true"
                        className={cn("size-4", starIndex < (activeTestimonial.rating ?? 5) && "fill-current")}
                        key={starIndex}
                      />
                    ))}
                  </div>
                </div>

                <blockquote className="mt-4 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
                  &ldquo;{activeTestimonial.quote}&rdquo;
                </blockquote>

                <div className="mt-16 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xl font-extrabold">
                      {activeTestimonial.name}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#62666d]">
                      {activeTestimonial.context}
                    </p>
                    {activeTestimonial.location ? (
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#62666d]">
                        <MapPin aria-hidden="true" className="size-4" />
                        {activeTestimonial.location}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      aria-label="Show previous testimonial"
                      className="grid size-11 place-items-center border border-black/15 bg-white text-[#101217] transition-colors hover:bg-[#101217] hover:text-white"
                      onClick={showPrevious}
                      type="button"
                    >
                      <ArrowLeft aria-hidden="true" className="size-5" />
                    </button>
                    <button
                      aria-label="Show next testimonial"
                      className="grid size-11 place-items-center border border-black/15 bg-white text-[#101217] transition-colors hover:bg-[#101217] hover:text-white"
                      onClick={showNext}
                      type="button"
                    >
                      <ArrowRight aria-hidden="true" className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

