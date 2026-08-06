"use client";

import Image from "next/image";
import Link from "next/link";

import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { ContactSection } from "@/features/home/components/contact-section";
import { TeamSection } from "@/features/home/components/team-section";
import { cn } from "@/lib/utils";

const values = [
  {
    title: "Care comes first",
    description:
      "Every appointment should feel respectful, comfortable, and shaped around the person receiving it.",
  },
  {
    title: "Prepared to travel",
    description:
      "We bring the tools, setup, and service plan needed to create a professional experience in your space.",
  },
  {
    title: "Personal, never generic",
    description:
      "Services, timing, and finishes are discussed around your preferences rather than forced into one fixed routine.",
  },
  {
    title: "Experience you can trust",
    description:
      "Our team brings deep beauty-industry knowledge across nails, lashes, massage, waxing, and foot care.",
  },
];

const bookingSteps = [
  {
    number: "01",
    title: "Tell us what you need",
    description:
      "Share your service interests, location, preferred date, and whether the booking is private or for a group.",
  },
  {
    number: "02",
    title: "We shape the appointment",
    description:
      "We coordinate the right professional, timing, service mix, and setup for the space you have in mind.",
  },
  {
    number: "03",
    title: "Beauty arrives at your door",
    description:
      "Your professional arrives prepared so you can settle in, enjoy the service, and skip the salon commute.",
  },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <AboutHero />
        <OurStory />
        <OurValues />
        <HowItWorks />
        <TeamSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}

function AboutHero() {
  return (
    <section className="overflow-hidden bg-[#f4f1eb] text-[#101217]">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:pb-20 lg:pt-16 2xl:px-10">
        <div className="flex min-h-[560px] flex-col justify-between">
          <ScrollReveal variant="fade-right">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
              About Us
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Beauty care should fit into your life.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a] sm:text-lg">
              Beauty @ Your Door brings experienced beauty professionals to
              homes, workplaces, hotels, bridal suites, and events across the
              Greater Toronto Area.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className={cn(
                  buttonVariants(),
                  "h-12 px-6 text-base font-bold",
                )}
                href="#story"
              >
                Read our story
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-12 border-black/20 bg-white/70 px-6 text-base font-bold hover:bg-white",
                )}
                href="/gallery"
              >
                See our work
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal
            className="mt-10 grid gap-5 border-t border-black/10 pt-6 sm:grid-cols-3"
            delay={120}
          >
            <div>
              <p className="text-3xl font-extrabold">24+</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#696c72]">
                Years of lead experience
              </p>
            </div>
            <div>
              <p className="text-3xl font-extrabold">5+</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#696c72]">
                Service categories
              </p>
            </div>
            <div>
              <p className="text-3xl font-extrabold">GTA</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#696c72]">
                Mobile service area
              </p>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal
          className="relative min-h-[520px] overflow-hidden bg-[#d9b8a5] lg:min-h-[680px]"
          delay={80}
          variant="clip-up"
        >
          <Image
            alt="Beauty @ Your Door team wearing branded shirts"
            className="object-cover object-center"
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            src="/images/new-pics-for-the-ladies/beauty-team-group-portrait-06.webp"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101217]/72 via-[#101217]/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0c8d3]">
              Our belief
            </p>
            <p className="mt-3 max-w-md text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Professional care can still feel deeply personal.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function OurStory() {
  return (
    <section className="bg-background py-24 text-[#101217]" id="story">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 2xl:px-10">
        <ScrollReveal
          className="relative min-h-[520px] overflow-hidden bg-[#101217]"
          variant="fade-right"
        >
          <Image
            alt="Beauty @ Your Door mobile beauty professionals"
            className="object-cover object-center"
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            src="/images/new-pics-for-the-ladies/beauty-team-group-portrait-02.webp"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101217]/82 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-3 p-5 text-white sm:p-7">
            <div className="border border-white/20 bg-black/20 p-4 backdrop-blur-sm">
              <p className="text-sm font-bold">Private and group care</p>
            </div>
            <div className="border border-white/20 bg-black/20 p-4 backdrop-blur-sm">
              <p className="text-sm font-bold">Delivered across the GTA</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal
          className="flex flex-col justify-center lg:px-8"
          variant="fade-left"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#a36f4d]">
            Why we exist
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            We removed the commute, not the quality.
          </h2>
          <div className="mt-7 max-w-3xl space-y-5 text-base leading-8 text-[#5f6268]">
            <p>
              Beauty appointments often ask clients to rearrange their day,
              travel, wait, and fit into a salon&apos;s rhythm. We built Beauty
              at Your Door around a simpler idea: experienced care should be
              able to meet people where they already are.
            </p>
            <p>
              Our mobile model gives clients more privacy, flexibility, and
              control. It also makes coordinated beauty care easier for bridal
              mornings, birthdays, workplace wellness, spa parties, hotel
              stays, and anyone who simply feels more comfortable at home.
            </p>
            <p>
              The location may change, but the standard does not. Every booking
              is planned around preparation, professionalism, a polished
              finish, and a calm client experience.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function OurValues() {
  return (
    <section className="bg-[#f4f1eb] py-24 text-[#101217]">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal className="grid gap-6 border-b border-black/10 pb-9 lg:grid-cols-[1fr_0.7fr] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#a36f4d]">
              What guides us
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              The standard behind every appointment.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[#5f6268]">
            Convenience matters, but trust is built through how people are
            treated, how carefully the service is prepared, and how consistent
            the final result feels.
          </p>
        </ScrollReveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {values.map((value, index) => (
              <ScrollReveal
                as="article"
                className="relative min-h-72 overflow-hidden border border-black/10 bg-white/75 p-6 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-2xl hover:shadow-black/10"
                delay={index * 80}
                key={value.title}
                variant="scale-up"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="relative mt-16 text-2xl font-extrabold tracking-tight">
                  {value.title}
                </h3>
                <p className="relative mt-3 max-w-sm text-sm leading-6 text-[#5f6268]">
                  {value.description}
                </p>
              </ScrollReveal>
            ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="overflow-hidden bg-[#101217] py-24 text-white">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <ScrollReveal variant="fade-right">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#f0c8d3]">
              How it works
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Thoughtful planning before the first tool is unpacked.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/65">
              A strong mobile appointment starts with the right information.
              That lets us prepare the service, professional, and timing around
              your actual needs.
            </p>
            <Link
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "mt-8 h-12 bg-white px-6 text-base font-bold text-[#101217] hover:bg-[#f0c8d3]",
              )}
              href="#contact"
            >
              Start a booking
            </Link>
          </ScrollReveal>

          <div>
            {bookingSteps.map((step, index) => (
              <ScrollReveal
                className="grid gap-5 border-t border-white/15 py-8 sm:grid-cols-[5rem_1fr]"
                delay={index * 90}
                key={step.number}
                variant="fade-left"
              >
                <span className="font-mono text-sm text-[#f0c8d3]">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 sm:text-base sm:leading-7">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
