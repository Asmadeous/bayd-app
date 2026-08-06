import Link from "next/link";
import Image from "next/image";

import { siteConfig } from "@/lib/site";

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
          <p className="mt-4">Mississauga</p>
          <p className="mt-3">Brampton</p>
          <p className="mt-3">Toronto</p>
          <p className="mt-3">Neighbouring west end GTA communities</p>
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
