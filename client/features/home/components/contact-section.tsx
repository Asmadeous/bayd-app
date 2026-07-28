import { Mail, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "@/features/home/components/section-heading";
import { cn } from "@/lib/utils";

export function ContactSection() {
  return (
    <section className="bg-[#f7f1ec] py-20" id="contact">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 2xl:px-10">
        <ScrollReveal variant="fade-right">
          <SectionHeading
            eyebrow="Book"
            title="Tell us where, when, and what kind of service you need."
            description="Start with a direct call or email and share the details of your appointment. We will help coordinate the service, timing, and setup."
          />
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2">
          <ScrollReveal
            as="a"
            className="group border border-black/10 bg-white p-6 transition-colors hover:border-[#a36f4d]"
            delay={80}
            href="tel:+14165550198"
            variant="fade-up"
          >
            <Phone aria-hidden="true" className="size-5 text-[#a36f4d]" />
            <p className="mt-5 text-lg font-semibold text-foreground">
              Call to book
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              +1 416 555 0198
            </p>
          </ScrollReveal>
          <ScrollReveal
            as="a"
            className="group border border-black/10 bg-white p-6 transition-colors hover:border-[#a36f4d]"
            delay={160}
            href="mailto:hello@beautyservicesatyourdoor.com"
            variant="fade-up"
          >
            <Mail aria-hidden="true" className="size-5 text-[#a36f4d]" />
            <p className="mt-5 text-lg font-semibold text-foreground">
              Email details
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              hello@beautyservicesatyourdoor.com
            </p>
          </ScrollReveal>

          <ScrollReveal
            className="border border-black/10 bg-[#17110d] p-6 text-white sm:col-span-2"
            delay={220}
            variant="clip-up"
          >
            <p className="text-lg font-semibold">Good details to include</p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Location, date, time window, guest count, service interests, and
              whether this is a private appointment, party, workplace event, or
              bridal booking.
            </p>
            <a
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "mt-6",
              )}
              href="mailto:hello@beautyservicesatyourdoor.com"
            >
              Start an email
            </a>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
