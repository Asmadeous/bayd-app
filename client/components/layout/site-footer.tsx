import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-black/10 bg-[#101217] text-white">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 pb-44 pt-16 sm:px-6 md:grid-cols-[1.35fr_0.7fr_0.7fr_0.7fr] lg:px-8 lg:pb-52 lg:pt-20 2xl:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f0c8d3]">
            Beauty at Your Door
          </p>
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
          <p className="mt-3">Neighbouring GTA communities</p>
        </div>

        <div className="text-sm text-white/62">
          <p className="font-extrabold text-white">Contact</p>
          <a className="mt-4 block hover:text-white" href="tel:+14165550198">
            +1 416 555 0198
          </a>
          <a
            className="mt-3 block hover:text-white"
            href="mailto:hello@beautyservicesatyourdoor.com"
          >
            hello@beautyservicesatyourdoor.com
          </a>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-2.25rem] left-0 flex w-max animate-footer-text-marquee whitespace-nowrap text-[7rem] font-black uppercase leading-none tracking-normal text-white/[0.12] sm:text-[10rem] lg:text-[14rem]"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <span className="mr-12" key={index}>
            Beauty at Your Door
          </span>
        ))}
      </div>
    </footer>
  );
}
