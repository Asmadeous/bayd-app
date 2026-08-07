"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Menu,
  ShoppingBag,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Blog", href: "/blog" },
  { label: "Careers", href: "/careers" },
];

type SiteHeaderProps = {
  cartCount?: number;
  onOpenCart?: () => void;
};

export function SiteHeader({ cartCount = 0, onOpenCart }: SiteHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  function closeMenus() {
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 bg-[#f4f1eb]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1760px] items-center justify-between px-4 sm:px-6 lg:px-8 2xl:px-10">
        <Link
          href="/"
          className="relative block h-11 w-[4.9rem] sm:w-[5.4rem]"
          onClick={closeMenus}
        >
          <Image
            alt="Beauty @ Your Door"
            className="object-contain"
            fill
            priority
            src="/images/brand/bayd-logo-black.png"
            unoptimized
          />
        </Link>

        <div className="hidden self-stretch md:flex md:items-center">
          <nav className="flex items-center gap-5 text-sm font-semibold text-[#272a2f] lg:gap-7">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[#c96c83]"
                onClick={closeMenus}
              >
                {item.label}
              </Link>
            ))}
          </nav>
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
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "px-5 font-bold",
            )}
            href="/shop"
            onClick={closeMenus}
          >
            Shop
          </Link>
          <a
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "bg-white/75 px-5 font-bold",
            )}
            href="/signin"
            onClick={closeMenus}
          >
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
          <nav className="grid border-t border-black/10">
            {navigation.map((item) => (
              <Link
                className="border-b border-black/10 py-4 text-lg font-extrabold text-[#101217] transition-colors hover:text-[#c96c83]"
                href={item.href}
                key={item.href}
                onClick={closeMobileMenu}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-4 h-11 w-full px-5 font-bold",
            )}
            href="/shop"
            onClick={closeMobileMenu}
          >
            Shop
          </Link>
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "mt-3 h-11 w-full bg-white/75 px-5 font-bold",
            )}
            href="/signin"
            onClick={closeMobileMenu}
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
