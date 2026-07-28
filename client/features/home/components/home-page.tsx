import type { HomePageContent } from "@/features/home/types/home-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BenefitsSection } from "@/features/home/components/benefits-section";
import { ContactSection } from "@/features/home/components/contact-section";
import { HeroSection } from "@/features/home/components/hero-section";
import { ServicesSection } from "@/features/home/components/services-section";
import { TeamSection } from "@/features/home/components/team-section";
import { TestimonialsSection } from "@/features/home/components/testimonials-section";

type HomePageProps = {
  content: HomePageContent;
};

export function HomePage({ content }: HomePageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <HeroSection />
        <ServicesSection services={content.services} />
        <BenefitsSection benefits={content.benefits} />
        <TeamSection />
        <TestimonialsSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
