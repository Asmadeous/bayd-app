"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  BadgePercent,
  BookOpenText,
  BriefcaseBusiness,
  Gem,
  HeartHandshake,
  Images,
  Menu,
  Scissors,
  ShoppingBag,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { BookButton } from "@/components/ui/book-button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/#services" },
  { label: "Team", href: "/team" },
  { label: "Prices", href: "/prices" },
  { label: "Gallery", href: "/gallery" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
];

const menuLinks = [
  {
    label: "About",
    href: "/about",
    description: "Learn how Beauty at Your Door brings care to every setting.",
    icon: Sparkles,
  },
  {
    label: "Services",
    href: "/#services",
    description: "Lashes, massage, nails, pedicures, manicures, and events.",
    icon: Scissors,
  },
  {
    label: "Team",
    href: "/team",
    description: "Meet the mobile beauty professionals behind each booking.",
    icon: UsersRound,
  },
  {
    label: "Prices",
    href: "/prices",
    description: "Explore starting prices, bundles, and group booking options.",
    icon: BadgePercent,
  },
  {
    label: "Shop",
    href: "/shop",
    description:
      "Browse beauty essentials, aftercare, and appointment add-ons.",
    icon: ShoppingBag,
  },
  {
    label: "Blog",
    href: "/blog",
    description: "Beauty care notes, prep guides, and service inspiration.",
    icon: BookOpenText,
  },
  {
    label: "Gallery",
    href: "/gallery",
    description: "See finished looks and service moments from previous work.",
    icon: Images,
  },
  {
    label: "Loyalty",
    href: "/loyalty",
    description: "Rewards, perks, member offers, and repeat booking benefits.",
    icon: Gem,
  },
  {
    label: "Careers",
    href: "/careers",
    description: "Join the team — browse open roles and apply online.",
    icon: BriefcaseBusiness,
  },
];

type SiteHeaderProps = {
  cartCount?: number;
  onOpenCart?: () => void;
};

export function SiteHeader({ cartCount = 0, onOpenCart }: SiteHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMenuDismissed, setIsDesktopMenuDismissed] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  function closeMenus() {
    setIsMobileMenuOpen(false);
    setIsDesktopMenuDismissed(true);
  }

  return (
    <header className="sticky top-0 z-40 bg-[#f4f1eb]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1760px] items-center justify-between px-4 sm:px-6 lg:px-8 2xl:px-10">
        <Link href="/" className="flex items-center gap-3" onClick={closeMenus}>
          <span className="text-xl font-bold tracking-tight text-[#121417]">
            Beauty at Your Door
          </span>
        </Link>

        <div
          className="group/nav relative hidden self-stretch md:flex md:items-center"
          onMouseLeave={() => setIsDesktopMenuDismissed(false)}
        >
          <nav className="flex items-center gap-8 text-sm font-semibold text-[#272a2f]">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[#c96c83]"
                onClick={closeMenus}
                onMouseEnter={() => setIsDesktopMenuDismissed(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div
            className={cn(
              "pointer-events-none fixed left-0 right-0 top-16 hidden -translate-y-10 overflow-hidden border-t border-black/10 bg-[#f4f1eb] opacity-0 shadow-2xl shadow-black/10 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:block",
              !isDesktopMenuDismissed &&
                "group-hover/nav:pointer-events-auto group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-focus-within/nav:pointer-events-auto group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100",
            )}
          >
            <div className="mx-auto grid w-full max-w-[1760px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 2xl:px-10">
              <div className="relative isolate flex min-h-[440px] flex-col justify-between overflow-hidden bg-[#17110d] p-8 text-white">
                <div className="absolute bottom-0 right-0 top-0 -z-20 w-[58%] overflow-hidden">
                  <Image
                    src="/images/lashes3.jpg"
                    alt="Close-up beauty service result"
                    fill
                    sizes="(min-width: 1024px) 24vw, 100vw"
                    className="object-cover object-[78%_70%] opacity-80"
                  />
                </div>
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#17110d_0%,#17110d_48%,rgba(23,17,13,0.94)_60%,rgba(23,17,13,0.68)_76%,rgba(23,17,13,0.3)_100%)]" />
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_88%_84%,rgba(240,200,211,0.22),transparent_36%)]" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f0c8d3]">
                    Beauty Platform
                  </p>
                  <h2 className="mt-4 max-w-lg text-4xl font-extrabold leading-tight">
                    Find every beauty service, product, and community touchpoint
                    in one place.
                  </h2>
                </div>
                <BookButton
                  className="mt-10 inline-flex w-fit items-center gap-2 bg-white px-5 py-3 text-sm font-bold text-[#17110d]"
                >
                  Plan A Booking
                  <HeartHandshake aria-hidden="true" className="size-4" />
                </BookButton>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {menuLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      className="group/link relative min-h-44 overflow-hidden border border-black/10 bg-white/75 p-5 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-black/10"
                      href={item.href}
                      key={item.label}
                      onClick={closeMenus}
                    >
                      <span className="pointer-events-none absolute -bottom-8 -right-7 text-[#f1d5df] transition-all group-hover/link:-bottom-6 group-hover/link:-right-5 group-hover/link:text-[#e8baca]">
                        <Icon
                          aria-hidden="true"
                          className="size-28 stroke-[1.25]"
                        />
                      </span>
                      <span className="relative block text-lg font-extrabold text-[#101217]">
                        {item.label}
                      </span>
                      <span className="relative mt-2 block max-w-[13rem] text-sm leading-6 text-[#5f6268]">
                        {item.description}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {onOpenCart ? (
            <button
              aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
              className="relative grid size-9 place-items-center border border-black/10 bg-white/75 text-[#101217] transition-colors hover:bg-white hover:text-[#c96c83]"
              onClick={onOpenCart}
              type="button"
            >
              <ShoppingBag aria-hidden="true" className="size-5" />
              <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center bg-[#101217] px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-white">
                {cartCount}
              </span>
            </button>
          ) : null}
          <a
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "bg-white/75 px-5 font-bold",
            )}
            href="/signin"
            onClick={closeMenus}
          >
            <UserRound aria-hidden="true" />
            Sign In
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {onOpenCart ? (
            <button
              aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
              className="relative grid size-9 place-items-center border border-black/10 bg-white/75 text-[#101217] transition-colors hover:bg-white hover:text-[#c96c83]"
              onClick={onOpenCart}
              type="button"
            >
              <ShoppingBag aria-hidden="true" className="size-5" />
              <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center bg-[#101217] px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-white">
                {cartCount}
              </span>
            </button>
          ) : null}
          <Button
            aria-expanded={isMobileMenuOpen}
            aria-label={
              isMobileMenuOpen ? "Close navigation" : "Open navigation"
            }
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            size="icon-lg"
            variant="outline"
          >
            {isMobileMenuOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "fixed left-0 right-0 top-16 overflow-hidden border-t border-black/10 bg-[#f4f1eb] shadow-2xl shadow-black/10 transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
          isMobileMenuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-4 opacity-0",
        )}
      >
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto px-4 py-5 sm:px-6">
          <div className="relative isolate min-h-56 overflow-hidden bg-[#17110d] p-5 text-white">
            <div className="absolute bottom-0 right-0 top-0 -z-20 w-[58%] overflow-hidden">
              <Image
                src="/images/lashes3.jpg"
                alt="Close-up beauty service result"
                fill
                sizes="100vw"
                className="object-cover object-[78%_70%] opacity-80"
              />
            </div>
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#17110d_0%,#17110d_52%,rgba(23,17,13,0.82)_74%,rgba(23,17,13,0.28)_100%)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f0c8d3]">
              Beauty Platform
            </p>
            <h2 className="mt-4 max-w-[18rem] text-3xl font-extrabold leading-tight">
              Services, pricing, shop, and community in one place.
            </h2>
            <BookButton
              className="mt-8 inline-flex w-fit items-center gap-2 bg-white px-4 py-3 text-sm font-bold text-[#17110d]"
            >
              Plan A Booking
              <HeartHandshake aria-hidden="true" className="size-4" />
            </BookButton>
          </div>

          <nav className="mt-4 grid gap-2 sm:grid-cols-2">
            {menuLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="group/link relative min-h-28 overflow-hidden border border-black/10 bg-white/80 p-4 transition-all hover:bg-white"
                  href={item.href}
                  key={item.label}
                  onClick={closeMobileMenu}
                >
                  <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-7 -right-5 size-24 stroke-[1.25] text-[#f1d5df] transition-all group-hover/link:text-[#e8baca]"
                  />
                  <span className="relative block text-lg font-extrabold text-[#101217]">
                    {item.label}
                  </span>
                  <span className="relative mt-1 block max-w-[14rem] text-sm leading-6 text-[#5f6268]">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>

          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "mt-3 h-11 w-full bg-white/75 px-5 font-bold",
            )}
            href="/signin"
            onClick={closeMobileMenu}
          >
            <UserRound aria-hidden="true" />
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
