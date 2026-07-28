"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Expand,
  Images,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";

import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { BookButton } from "@/components/ui/book-button";
import { galleryItems as staticGalleryItems } from "@/features/gallery/data";
import type {
  GalleryCategory,
  GalleryItem,
} from "@/features/gallery/types";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface ApiGalleryItem {
  id: number;
  title: string;
  category: string;
  description: string | null;
  image_url: string;
  image_alt: string | null;
  size: "standard" | "wide" | "tall";
}

function mapApiItem(item: ApiGalleryItem): GalleryItem {
  return {
    id: String(item.id),
    title: item.title,
    category: item.category as GalleryCategory,
    description: item.description ?? "",
    image: {
      src: item.image_url,
      alt: item.image_alt ?? item.title,
    },
    size: item.size,
  };
}

const categories: Array<"All" | GalleryCategory> = [
  "All",
  "Lashes",
  "Nails",
  "Massage",
  "Pedicure",
  "Waxing",
];

export function GalleryPage() {
  const [activeCategory, setActiveCategory] =
    useState<(typeof categories)[number]>("All");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);

  const { data: apiItems } = useQuery<ApiGalleryItem[]>({
    queryKey: ["gallery-items-public"],
    queryFn: () => api.get<ApiGalleryItem[]>("/gallery_items").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Use API items when available, fall back to static seed data
  const galleryItems: GalleryItem[] = useMemo(
    () => (apiItems && apiItems.length > 0 ? apiItems.map(mapApiItem) : staticGalleryItems),
    [apiItems],
  );

  const visibleItems = useMemo(
    () =>
      activeCategory === "All"
        ? galleryItems
        : galleryItems.filter((item) => item.category === activeCategory),
    [activeCategory, galleryItems],
  );

  const selectedIndex = selectedItem
    ? visibleItems.findIndex((item) => item.id === selectedItem.id)
    : -1;

  function moveSelection(direction: -1 | 1) {
    if (selectedIndex < 0) return;

    const nextIndex =
      (selectedIndex + direction + visibleItems.length) % visibleItems.length;
    setTransitionDirection(direction);
    setSelectedItem(visibleItems[nextIndex]);
  }

  useEffect(() => {
    if (!selectedItem) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedItem(null);
      if (event.key === "ArrowLeft") moveSelection(-1);
      if (event.key === "ArrowRight") moveSelection(1);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <GalleryHero />
        <GalleryCollection
          activeCategory={activeCategory}
          items={visibleItems}
          onCategoryChange={(category) => {
            setActiveCategory(category);
            setSelectedItem(null);
          }}
          onSelect={setSelectedItem}
        />
        <GalleryTrustBand />
      </main>
      <SiteFooter />
      {selectedItem ? (
        <GalleryViewer
          current={selectedIndex + 1}
          direction={transitionDirection}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onNext={() => moveSelection(1)}
          onPrevious={() => moveSelection(-1)}
          total={visibleItems.length}
        />
      ) : null}
    </div>
  );
}

function GalleryHero() {
  return (
    <section className="overflow-hidden bg-[#f4f1eb] text-[#101217]">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:pb-20 lg:pt-16 2xl:px-10">
        <div className="flex min-h-[540px] flex-col justify-between">
          <ScrollReveal variant="fade-right">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
              Our Work
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Results you can see before we arrive.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a] sm:text-lg">
              Explore finished looks and service moments across lashes, nails,
              massage, pedicures, and waxing. Every image helps you understand
              the care, detail, and finish you can expect from your booking.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className={cn(
                  buttonVariants(),
                  "h-12 px-6 text-base font-bold",
                )}
                href="#work"
              >
                Explore the work
                <Images aria-hidden="true" />
              </Link>
              <BookButton
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-12 border-black/20 bg-white/70 px-6 text-base font-bold hover:bg-white",
                )}
              >
                Book your look
                <ArrowUpRight aria-hidden="true" />
              </BookButton>
            </div>
          </ScrollReveal>

          <ScrollReveal
            className="mt-10 grid gap-3 border-t border-black/10 pt-6 text-sm font-semibold text-[#4f535a] sm:grid-cols-3"
            delay={120}
          >
            <span className="inline-flex items-center gap-2">
              <Check aria-hidden="true" className="size-4 text-[#a36f4d]" />
              Finished results
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles aria-hidden="true" className="size-4 text-[#a36f4d]" />
              Service details
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 text-[#a36f4d]" />
              Mobile appointments
            </span>
          </ScrollReveal>
        </div>

        <ScrollReveal
          className="grid min-h-[590px] grid-cols-2 grid-rows-2 gap-3 sm:gap-4 lg:min-h-[680px]"
          delay={80}
          variant="clip-up"
        >
          <div className="relative row-span-2 overflow-hidden bg-[#101217]">
            <Image
              alt="Yellow French-tip manicure displayed against green leaves"
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 28vw, 50vw"
              src="/images/nails1.jpg"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 pt-20 text-white sm:p-7">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#f0c8d3]">
                Nails
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight">
                Detail worth showing.
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden bg-[#d9b8a5]">
            <Image
              alt="Natural lash extension result"
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 28vw, 50vw"
              src="/images/lashes7.jpg"
            />
          </div>
          <div className="relative overflow-hidden bg-[#e7ded5]">
            <Image
              alt="Client receiving a relaxing massage"
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 28vw, 50vw"
              src="/images/massage.jpg"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function GalleryCollection({
  activeCategory,
  items,
  onCategoryChange,
  onSelect,
}: {
  activeCategory: (typeof categories)[number];
  items: GalleryItem[];
  onCategoryChange: (category: (typeof categories)[number]) => void;
  onSelect: (item: GalleryItem) => void;
}) {
  return (
    <section className="bg-background py-20 text-[#101217]" id="work">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal className="flex flex-col gap-7 border-b border-black/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
              Work Gallery
            </p>
            <h2 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl">
              Browse by the service you are considering.
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-[#5f6268]">
            Select a category to narrow the collection, then open any image for
            a closer look at the finish and service details.
          </p>
        </ScrollReveal>

        <div
          aria-label="Filter gallery by service"
          className="mt-7 flex max-w-full gap-2 overflow-x-auto pb-2"
          role="group"
        >
          {categories.map((category) => (
            <button
              aria-pressed={activeCategory === category}
              className={cn(
                "shrink-0 border px-5 py-3 text-sm font-extrabold transition-colors",
                activeCategory === category
                  ? "border-[#101217] bg-[#101217] text-white"
                  : "border-black/10 bg-[#f4f1eb] text-[#101217] hover:border-[#c96c83] hover:bg-white",
              )}
              key={category}
              onClick={() => onCategoryChange(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-8 grid auto-rows-[18rem] gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => (
            <ScrollReveal
              className={cn(
                item.size === "wide" && "sm:col-span-2",
                item.size === "tall" && "row-span-2",
              )}
              delay={(index % 4) * 70}
              key={item.id}
              variant="scale-up"
            >
              <button
                aria-label={`View ${item.title}`}
                className="group relative h-full w-full overflow-hidden bg-[#e8dfd6] text-left"
                onClick={() => onSelect(item)}
                type="button"
              >
                <Image
                  alt={item.image.alt}
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                  src={item.image.src}
                  style={{ objectPosition: item.image.position }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101217]/85 via-[#101217]/5 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-5 text-white sm:p-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f0c8d3]">
                      {item.category}
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold tracking-tight">
                      {item.title}
                    </h3>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center bg-white text-[#101217] transition-transform group-hover:-translate-y-1">
                    <Expand aria-hidden="true" className="size-4" />
                  </span>
                </div>
              </button>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryTrustBand() {
  return (
    <section className="bg-[#f4f1eb] py-20 text-[#101217]">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal
          className="relative isolate overflow-hidden bg-[#101217] px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16"
          variant="clip-up"
        >
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 -z-10 size-96 rounded-full bg-[#c96c83]/20 blur-3xl"
          />
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#f0c8d3]">
                Your turn
              </p>
              <h2 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
                Seen something close to the look or care you need?
              </h2>
            </div>
            <div>
              <p className="max-w-xl text-base leading-7 text-white/68">
                Share the service, style, and date you have in mind. We will
                help shape the appointment around your location, timing, and
                preferred finish.
              </p>
              <BookButton
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "mt-7 h-12 bg-white px-6 text-base font-bold text-[#101217] hover:bg-[#f0c8d3]",
                )}
              >
                Plan my appointment
                <ArrowUpRight aria-hidden="true" />
              </BookButton>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function GalleryViewer({
  current,
  direction,
  item,
  onClose,
  onNext,
  onPrevious,
  total,
}: {
  current: number;
  direction: -1 | 1;
  item: GalleryItem;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  total: number;
}) {
  const reduceMotion = useReducedMotion();
  const imageOffset = reduceMotion ? 0 : direction * 72;
  const contentOffset = reduceMotion ? 0 : direction * 28;
  const transition = {
    duration: reduceMotion ? 0.15 : 0.48,
    ease: [0.16, 1, 0.3, 1] as const,
  };

  return (
    <div
      aria-label={`${item.title} image viewer`}
      aria-modal="true"
      className="fixed inset-0 z-[70] grid bg-[#101217]/96 p-3 text-white backdrop-blur-md sm:p-5"
      role="dialog"
    >
      <button
        aria-label="Close image viewer"
        className="absolute right-4 top-4 z-20 grid size-11 place-items-center bg-white text-[#101217] transition-colors hover:bg-[#f0c8d3] sm:right-6 sm:top-6"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" className="size-5" />
      </button>

      <div className="mx-auto grid h-full w-full max-w-[1500px] grid-rows-[minmax(0,1fr)_auto] overflow-hidden lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.55fr)] lg:grid-rows-1">
        <div className="relative min-h-0 overflow-hidden bg-black/20">
          <AnimatePresence custom={direction} initial={false}>
            <motion.div
              animate={{ opacity: 1, scale: 1, x: 0 }}
              className="absolute inset-0"
              custom={direction}
              exit={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.985,
                x: -imageOffset,
              }}
              initial={{
                opacity: 0,
                scale: reduceMotion ? 1 : 1.015,
                x: imageOffset,
              }}
              key={item.id}
              transition={transition}
            >
              <Image
                alt={item.image.alt}
                className="object-contain"
                fill
                priority
                sizes="(min-width: 1024px) 72vw, 100vw"
                src={item.image.src}
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 lg:bottom-6">
            <button
              aria-label="View previous image"
              className="grid size-11 place-items-center bg-white text-[#101217] transition-colors hover:bg-[#f0c8d3]"
              onClick={onPrevious}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              aria-label="View next image"
              className="grid size-11 place-items-center bg-white text-[#101217] transition-colors hover:bg-[#f0c8d3]"
              onClick={onNext}
              type="button"
            >
              <ArrowRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        <div className="relative min-h-56 overflow-hidden bg-[#f4f1eb] text-[#101217]">
          <AnimatePresence custom={direction} initial={false}>
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex h-full min-h-56 flex-col justify-end p-6 sm:p-8 lg:p-10"
              custom={direction}
              exit={{ opacity: 0, x: -contentOffset }}
              initial={{ opacity: 0, x: contentOffset }}
              key={item.id}
              transition={{
                ...transition,
                delay: reduceMotion ? 0 : 0.04,
              }}
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a36f4d]">
                {item.category}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {item.title}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#5f6268]">
                {item.description}
              </p>
              <div className="mt-7 flex items-center justify-between border-t border-black/10 pt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#777a80]">
                <span>
                  {current} / {total}
                </span>
                <span>Beauty at Your Door</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
