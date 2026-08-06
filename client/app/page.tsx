import { HomePage } from "@/features/home/components/home-page";
import { API_BASE_URL } from "@/lib/config";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site";
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

const SERVICE_FALLBACK_IMAGES: Record<string, string> = {
  lashes: "/images/new-pics-for-the-ladies/mobile-lash-appointment-02.webp",
  massage: "/images/massage.jpg",
  nails: "/images/new-pics-for-the-ladies/gel-manicure-service-01.webp",
  spa: "/images/lashes2.jpg",
  waxing:
    "/images/new-pics-for-the-ladies/nail-technician-portrait-at-work-02.webp",
};

function fallbackServiceImage(service: ApiService): string {
  const categoryKey = service.category_name?.toLowerCase() ?? "";

  if (service.name.toLowerCase().includes("pedicure")) {
    return "/images/pedicure3.jpg";
  }

  return (
    SERVICE_FALLBACK_IMAGES[categoryKey] ??
    "/images/new-pics-for-the-ladies/mobile-manicure-service-01.webp"
  );
}

function mapApiService(s: ApiService): Service {
  const imageSrc = s.image_url ?? fallbackServiceImage(s);

  return {
    id: String(s.id),
    title: s.name,
    description: s.description ?? "",
    price: `$${Number(s.price).toFixed(0)}+`,
    duration: `${s.duration_minutes}min`,
    image: {
      src: imageSrc,
      alt: s.name,
    },
    gallery: [{ src: imageSrc, alt: s.name }],
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
  let apiServices: ApiService[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/services`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      apiServices = await res.json();
    }
  } catch {
    apiServices = [];
  }
  const services = apiServices.map(mapApiService);
  const sameAs = [
    siteConfig.socialLinks.instagram,
    siteConfig.socialLinks.pinterest,
    siteConfig.socialLinks.tiktok,
  ];
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": `${siteConfig.url}/#business`,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.assets.logo}`,
    image: `${siteConfig.url}${siteConfig.assets.ogImage}`,
    description: siteConfig.description,
    slogan: siteConfig.tagline,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    priceRange: "$$",
    areaServed: siteConfig.serviceAreas.map((area) => ({
      "@type": area.includes("communities") ? "AdministrativeArea" : "City",
      name: area,
    })),
    sameAs,
    makesOffer: [
      "Mobile nails",
      "Mobile lashes",
      "Mobile massage",
      "Mobile facials",
      "Mobile waxing",
      "Mobile pedicure",
      "Mobile manicure",
      "Event beauty services",
    ].map((name) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name,
        areaServed: "Greater Toronto Area",
        audience: {
          "@type": "PeopleAudience",
          requiredGender: "Female",
        },
      },
    })),
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: siteConfig.url,
    publisher: {
      "@id": `${siteConfig.url}/#business`,
    },
  };

  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <JsonLd data={websiteSchema} />
      <HomePage content={{ services, benefits: BENEFITS }} />
    </>
  );
}
