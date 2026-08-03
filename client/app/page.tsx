import { HomePage } from "@/features/home/components/home-page";
import type { Benefit, Service } from "@/features/home/types/home-content";

interface ApiService {
  id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
  image_url: string | null;
  category_name: string | null;
}

function mapApiService(s: ApiService): Service {
  return {
    id: String(s.id),
    title: s.name,
    description: s.description ?? "",
    price: `$${Number(s.price).toFixed(0)}+`,
    duration: `${s.duration_minutes}min`,
    image: {
      src: s.image_url ?? "/images/lashes1.jpg",
      alt: s.name,
    },
    gallery: s.image_url ? [{ src: s.image_url, alt: s.name }] : [],
  };
}

const BENEFITS: Benefit[] = [
  {
    title: "We come to you",
    description:
      "Book in-home, workplace, hotel, bridal suite, or event-space service across the GTA.",
  },
  {
    title: "Built for groups",
    description:
      "Spa parties, birthdays, corporate wellness days, and bridal mornings can be tailored by guest count.",
  },
  {
    title: "Flexible scheduling",
    description:
      "Appointments are planned around your timing, setup needs, and preferred service mix.",
  },
  {
    title: "Professional finish",
    description:
      "A calm, prepared team brings the tools, setup, and polish needed for a reliable experience.",
  },
  {
    title: "Custom packages",
    description:
      "Combine nails, massage, skincare, lashes, waxing, and beauty prep into one coordinated booking.",
  },
  {
    title: "Team opportunities",
    description:
      "Independent beauty professionals can connect for mobile appointment and event work.",
  },
];

export default async function Home() {
  const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

  let apiServices: ApiService[] = [];
  try {
    const res = await fetch(`${BASE_URL}/services`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      apiServices = await res.json();
    }
  } catch {
    apiServices = [];
  }
  const services = apiServices.map(mapApiService);

  return <HomePage content={{ services, benefits: BENEFITS }} />;
}
