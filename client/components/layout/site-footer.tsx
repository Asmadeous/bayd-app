import Link from "next/link";
import Image from "next/image";

import { NewsletterSignup } from "@/components/layout/newsletter-signup";
import { siteConfig } from "@/lib/site";

// Accepted payment methods shown in the footer, from real logo/image assets in
// public/. Interac covers Interac e-Transfer. Each renders on a white chip so the
// brand colours read against the dark footer.
const PAYMENT_METHODS: { label: string; src: string; w: number; h: number }[] = [
  { label: "Visa", src: "/pngfind.com-visa-png-810117.png", w: 938, h: 356 },
  { label: "Mastercard", src: "/pngfind.com-master-card-logo-png-2088053.png", w: 800, h: 480 },
  { label: "Interac", src: "/interaclogosvg.png", w: 800, h: 450 },
  { label: "Credit / Debit", src: "/credit-card.png", w: 512, h: 512 },
  { label: "Cash", src: "/dollars.png", w: 512, h: 512 },
  { label: "Cheque", src: "/cheque.png", w: 512, h: 512 },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-black/10 bg-[#101217] text-white">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 pb-44 pt-16 sm:px-6 md:grid-cols-[1.35fr_0.7fr_0.7fr_0.7fr] lg:px-8 lg:pb-52 lg:pt-20 2xl:px-10">
        <div className="max-w-3xl">
          <Image
            alt="Beauty @ Your Door"
            className="h-16 w-auto object-contain sm:h-20"
            height={936}
            src="/images/brand/bayd-logo-white.png"
            unoptimized
            width={3264}
          />
          <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Mobile beauty care, thoughtful service, and professional polish
            wherever you are.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/65">
            Lashes, massages, nail tech, pedicure, manicure, waxing, and
            group-ready beauty appointments brought to homes, offices, hotels,
            and events.
          </p>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
            Get new posts by email
          </p>
          <NewsletterSignup />
        </div>

        <div className="text-sm text-white/62">
          <p className="font-extrabold text-white">Explore</p>
          <Link className="mt-4 block hover:text-white" href="/about">
            About
          </Link>
          <Link className="mt-3 block hover:text-white" href="/#services">
            Services
          </Link>
          <Link className="mt-3 block hover:text-white" href="/about#team">
            Team
          </Link>
          <Link className="mt-3 block hover:text-white" href="/prices">
            Prices
          </Link>
          <Link className="mt-3 block hover:text-white" href="/gallery">
            Gallery
          </Link>
          <Link className="mt-3 block hover:text-white" href="/shop">
            Shop
          </Link>
          <Link className="mt-3 block hover:text-white" href="/loyalty">
            Loyalty
          </Link>
          <Link className="mt-3 block hover:text-white" href="/careers">
            Careers
          </Link>
        </div>

        <div className="text-sm text-white/62">
          <p className="font-extrabold text-white">Service Area</p>
          {siteConfig.serviceAreas.map((area, index) => (
            <p className={index === 0 ? "mt-4" : "mt-3"} key={area}>
              {area}
            </p>
          ))}
        </div>

        <div className="text-sm text-white/62">
          <p className="font-extrabold text-white">Contact</p>
          <a
            className="mt-4 block hover:text-white"
            href={`tel:${siteConfig.phoneHref}`}
          >
            {siteConfig.phone}
          </a>
          <a
            className="mt-3 block hover:text-white"
            href={`mailto:${siteConfig.email}`}
          >
            {siteConfig.email}
          </a>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              aria-label="WhatsApp"
              className="grid size-10 place-items-center border border-white/15 text-white/70 transition-colors hover:border-white/35 hover:text-white"
              href={`https://wa.me/${siteConfig.phoneHref.replace(/\D/g, "")}`}
              rel="noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.516 5.26l-.999 3.648 3.972-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414z" />
              </svg>
            </a>
            <a
              aria-label="Instagram"
              className="grid size-10 place-items-center border border-white/15 text-white/70 transition-colors hover:border-white/35 hover:text-white"
              href={siteConfig.socialLinks.instagram}
              rel="noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect height="20" rx="5" ry="5" width="20" x="2" y="2" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
                <path d="M17.5 6.5h.01" />
              </svg>
            </a>
            <a
              aria-label="TikTok"
              className="grid size-10 place-items-center border border-white/15 text-white/70 transition-colors hover:border-white/35 hover:text-white"
              href={siteConfig.socialLinks.tiktok}
              rel="noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.6 6.2a5.2 5.2 0 0 1-3.1-1.1v8.1a5.1 5.1 0 1 1-5.1-5.1c.4 0 .8 0 1.2.1v2.9a2.3 2.3 0 1 0 1.2 2V2h2.8a5.2 5.2 0 0 0 3.1 4.7v-.5Z" />
              </svg>
            </a>
            <a
              aria-label="Pinterest"
              className="grid size-10 place-items-center border border-white/15 text-white/70 transition-colors hover:border-white/35 hover:text-white"
              href={siteConfig.socialLinks.pinterest}
              rel="noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2.1 0-3l1.2-5.1s-.3-.6-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.6 2 1.7 2 2 0 3.5-2.1 3.5-5.1 0-2.7-1.9-4.5-4.7-4.5a4.9 4.9 0 0 0-5.1 4.9c0 1 .4 2 .8 2.6.1.1.1.2.1.4l-.3 1.2c-.1.4-.3.5-.6.3-1.4-.6-2.2-2.6-2.2-4.3C5 8.2 7.5 5 12.5 5c3.9 0 6.9 2.8 6.9 6.5 0 3.8-2.4 6.9-5.8 6.9-1.1 0-2.2-.6-2.6-1.3l-.7 2.6c-.3 1-.9 2.2-1.3 2.9A10 10 0 1 0 12 2Z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Accepted payment methods — so clients stop asking what we take. */}
        <div className="border-t border-white/10 pt-6 md:col-span-full">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">
            Accepted payments
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-4">
            {PAYMENT_METHODS.map((method) => (
              <div key={method.label} className="flex w-14 flex-col items-center gap-1.5">
                <span className="grid h-9 w-full place-items-center rounded-md border border-white/15 bg-white/95">
                  <Image
                    src={method.src}
                    alt={method.label}
                    width={method.w}
                    height={method.h}
                    className="max-h-5 w-auto max-w-[2.75rem] object-contain"
                    unoptimized
                  />
                </span>
                <span className="text-center text-[11px] font-medium leading-tight text-white/55">
                  {method.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-2.25rem] left-0 flex w-max animate-footer-text-marquee whitespace-nowrap text-[7rem] font-black uppercase leading-none tracking-normal text-white/[0.12] sm:text-[10rem] lg:text-[14rem]"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <span className="mr-12" key={index}>
            Beauty @ Your Door
          </span>
        ))}
      </div>
    </footer>
  );
}
