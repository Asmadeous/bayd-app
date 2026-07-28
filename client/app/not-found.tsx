import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Home,
  Scissors,
  ShoppingBag,
} from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const quickLinks = [
  {
    label: "Explore services",
    description: "Browse mobile beauty treatments and appointment options.",
    href: "/#services",
    icon: Scissors,
  },
  {
    label: "Visit the shop",
    description: "Find beauty essentials, aftercare, and appointment add-ons.",
    href: "/shop",
    icon: ShoppingBag,
  },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#101217]">
      <SiteHeader />
      <main>
        <section className="overflow-hidden">
          <div className="mx-auto grid w-full max-w-[1760px] gap-5 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-10 2xl:px-10">
            <div className="relative isolate flex min-h-[540px] flex-col justify-between overflow-hidden bg-[#101217] p-6 text-white sm:min-h-[620px] sm:p-10 lg:min-h-[680px]">
              <div
                aria-hidden="true"
                className="absolute -right-6 -top-16 -z-20 text-[13rem] font-black leading-none tracking-[-0.1em] text-white/[0.06] sm:text-[20rem] lg:text-[24rem]"
              >
                404
              </div>
              <div
                aria-hidden="true"
                className="absolute -bottom-20 -left-20 -z-20 size-80 rounded-full bg-[#c96c83]/20 blur-3xl"
              />

              <div className="flex items-center justify-between gap-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#f0c8d3] sm:text-sm">
                  Page not found
                </p>
                <span className="font-mono text-sm text-white/45">404</span>
              </div>

              <div className="relative">
                <p className="text-[5.5rem] font-black leading-[0.75] tracking-[-0.09em] text-[#f0c8d3] sm:text-[8rem]">
                  404
                </p>
                <h1 className="mt-8 max-w-3xl text-5xl font-extrabold leading-[0.94] tracking-tight sm:text-7xl">
                  This page missed its appointment.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                  The link may have moved, expired, or never existed. Let&apos;s
                  get you back to a page that can help.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className={cn(
                      buttonVariants(),
                      "h-12 bg-white px-6 text-base font-bold text-[#101217] hover:bg-[#f0c8d3]",
                    )}
                    href="/"
                  >
                    <Home aria-hidden="true" />
                    Back home
                  </Link>
                  <Link
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-12 border-white/20 bg-white/10 px-6 text-base font-bold text-white hover:bg-white hover:text-[#101217]",
                    )}
                    href="/#contact"
                  >
                    Book a service
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <div className="relative isolate min-h-[360px] overflow-hidden bg-[#d9b8a5] sm:col-span-2 lg:min-h-0 lg:flex-1">
                <Image
                  alt="Beauty professional preparing a lash service"
                  className="-z-20 object-cover object-center"
                  fill
                  priority
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  src="/images/lashes3.jpg"
                />
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,18,23,0.04),rgba(16,18,23,0.72))]" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#f0c8d3]">
                    Still looking?
                  </p>
                  <p className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                    Start with the services our clients book most.
                  </p>
                </div>
              </div>

              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className="group relative min-h-52 overflow-hidden border border-black/10 bg-white/75 p-6 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-black/10 lg:min-h-44"
                    href={item.href}
                    key={item.label}
                  >
                    <Icon
                      aria-hidden="true"
                      className="absolute -bottom-8 -right-6 size-32 stroke-[1.15] text-[#f1d5df] transition-transform duration-300 group-hover:-translate-x-2 group-hover:-translate-y-2"
                    />
                    <div className="relative flex h-full flex-col justify-between">
                      <ArrowUpRight
                        aria-hidden="true"
                        className="ml-auto size-5 text-[#a36f4d]"
                      />
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight">
                          {item.label}
                        </h2>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-[#5f6268]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[1760px] items-center gap-3 px-4 pb-10 sm:px-6 lg:px-8 2xl:px-10">
            <ArrowLeft aria-hidden="true" className="size-4 text-[#a36f4d]" />
            <p className="text-sm text-[#5f6268]">
              Check the address, or choose one of the links above to continue.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
