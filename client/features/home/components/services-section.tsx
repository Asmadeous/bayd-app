"use client";

import { SectionHeading } from "@/features/home/components/section-heading";
import { ServiceCard } from "@/features/home/components/service-card";
import { ServiceModal } from "@/features/home/components/service-modal";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { Service } from "@/features/home/types/home-content";
import { type MouseEvent, useState } from "react";

type ServicesSectionProps = {
  services: Service[];
};

export function ServicesSection({ services }: ServicesSectionProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [modalOrigin, setModalOrigin] = useState({ x: 0, y: 0 });
  const topServices = services.slice(0, 3);
  const featuredService = services[3];
  const bottomServices = services.slice(4, 7);

  function openService(
    service: Service,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();

    setModalOrigin({
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: rect.top + rect.height / 2 - window.innerHeight / 2,
    });
    setSelectedService(service);
  }

  return (
    <section className="bg-background py-20" id="services">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            eyebrow="Services"
            title="Everything clients expect from a spa, arranged around them."
            description="Start with one appointment or build a package for a private group, bridal morning, corporate wellness day, or special occasion."
          />
        </ScrollReveal>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {topServices.map((service, index) => (
            <ScrollReveal delay={index * 90} key={service.id} variant="scale-up">
              <ServiceCard onSelect={openService} service={service} />
            </ScrollReveal>
          ))}
          {featuredService ? (
            <ScrollReveal
              className="md:col-span-3"
              delay={140}
              variant="clip-up"
            >
              <ServiceCard
                isFeatured
                onSelect={openService}
                service={featuredService}
              />
            </ScrollReveal>
          ) : null}
          {bottomServices.map((service, index) => (
            <ScrollReveal
              delay={index * 90}
              key={service.id}
              variant="scale-up"
            >
              <ServiceCard onSelect={openService} service={service} />
            </ScrollReveal>
          ))}
        </div>
      </div>
      <ServiceModal
        modalOrigin={modalOrigin}
        onClose={() => setSelectedService(null)}
        service={selectedService}
      />
    </section>
  );
}
