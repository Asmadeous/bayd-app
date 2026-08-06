"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { Clock, Star, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { BookButton } from "@/components/ui/book-button";
import type { Service } from "@/features/home/types/home-content";
import { cn } from "@/lib/utils";

type ServiceModalProps = {
  modalOrigin: {
    x: number;
    y: number;
  };
  onClose: () => void;
  service: Service | null;
};

export function ServiceModal({
  modalOrigin,
  onClose,
  service,
}: ServiceModalProps) {
  if (!service) {
    return null;
  }

  const panelStyle = {
    "--modal-x": `${modalOrigin.x}px`,
    "--modal-y": `${modalOrigin.y}px`,
  } as CSSProperties;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid animate-service-modal-overlay place-items-center bg-black/45 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="animate-service-modal-panel relative grid max-h-[92vh] w-full max-w-6xl overflow-y-auto bg-[#f4f1eb] p-4 shadow-2xl shadow-black/20 lg:grid-cols-[1fr_0.92fr] lg:p-8"
        onClick={(event) => event.stopPropagation()}
        style={panelStyle}
      >
        <button
          aria-label="Close service details"
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center bg-white text-[#101217] shadow-sm transition-colors hover:bg-[#101217] hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <div className="grid gap-4">
          {(service.gallery?.length ? service.gallery : [service.image]).map(
            (image, index) => (
              <div
                className={`relative min-h-[260px] overflow-hidden bg-[#ddd2c8] sm:min-h-[340px] ${
                  index === 0
                    ? "animate-service-image-grow-down"
                    : "animate-service-image-grow-up"
                }`}
                key={image.src}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ),
          )}
        </div>

        <div className="px-1 py-8 lg:px-8 lg:py-0">
          {service.rating && (
            <div className="animate-service-content-1 flex items-center gap-1 text-lg font-black text-[#101217]">
              <Star aria-hidden="true" className="size-5 fill-current" />
              <Star aria-hidden="true" className="size-5 fill-current" />
              <Star aria-hidden="true" className="size-5 fill-current" />
              <Star aria-hidden="true" className="size-5 fill-current" />
              <Star aria-hidden="true" className="size-5 fill-current" />
              <span className="ml-2 text-base">{service.rating}</span>
            </div>
          )}

          <h2 className="animate-service-content-2 mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-[#101217] sm:text-5xl">
            {service.title}
          </h2>

          <div className="animate-service-content-3 mt-5 flex items-center gap-5 text-base font-extrabold text-[#101217]">
            <span>{service.price}</span>
            <span className="inline-flex items-center gap-2">
              <Clock aria-hidden="true" className="size-4" />
              {service.duration}
            </span>
          </div>

          <p className="animate-service-content-4 mt-6 text-sm leading-6 text-[#3f4248]">
            {service.description}
          </p>

          {service.idealFor && (
            <div className="animate-service-content-5 mt-7">
              <h3 className="text-sm font-extrabold uppercase text-[#101217]">
                Ideal For:
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#3f4248]">
                {service.idealFor}
              </p>
            </div>
          )}

          {service.involved?.length ? (
            <div className="animate-service-content-6 mt-7">
              <h3 className="text-sm font-extrabold uppercase text-[#101217]">
                What&apos;s Involved:
              </h3>
              <ul className="mt-3 space-y-4">
                {service.involved.map((item) => (
                  <li
                    className="text-sm leading-6 text-[#3f4248] before:mr-2 before:inline-block before:size-2 before:bg-[#101217] before:content-['']"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <BookButton
            serviceId={service.id}
            className={cn(
              buttonVariants(),
              "animate-service-content-7 mt-8 h-12 rounded-none px-8 text-base font-bold",
            )}
          >
            Book Now
          </BookButton>
        </div>
      </div>
    </div>
  );
}
