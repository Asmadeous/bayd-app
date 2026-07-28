import type { LucideIcon } from "lucide-react";

export type HeroImage = {
  src: string;
  alt: string;
};

export type Service = {
  id: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  rating?: string;
  idealFor?: string;
  involved?: string[];
  image: HeroImage;
  gallery?: HeroImage[];
};

export type Benefit = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type HomePageContent = {
  services: Service[];
  benefits: Benefit[];
};
