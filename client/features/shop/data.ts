import type { ShopProduct } from "@/features/shop/types";

export const shopProducts: ShopProduct[] = [
  {
    id: "lash-aftercare-kit",
    name: "Lash Aftercare Kit",
    category: "Lashes",
    price: "$28",
    image: {
      src: "/images/lashes1.jpg",
      alt: "Soft lash extension close-up used as a placeholder product image",
    },
    badge: "Best seller",
    description:
      "A simple take-home care kit for keeping lash sets clean, lifted, and appointment-ready.",
    details: ["Foaming cleanser", "Soft cleansing brush", "Travel spoolie"],
  },
  {
    id: "cuticle-care-duo",
    name: "Cuticle Care Duo",
    category: "Nails",
    price: "$22",
    image: {
      src: "/images/Medicure1.jpg",
      alt: "Manicure service image used as a placeholder for nail care product",
    },
    badge: "Everyday care",
    description:
      "Hydrating essentials for fresh-looking hands between manicure appointments.",
    details: ["Cuticle oil", "Hand balm", "Small enough for a handbag"],
  },
  {
    id: "pedicure-refresh-bundle",
    name: "Pedicure Refresh Bundle",
    category: "Feet",
    price: "$34",
    image: {
      src: "/images/pedicure1.jpg",
      alt: "Pedicure setup used as a placeholder for foot care products",
    },
    badge: "Spa finish",
    description:
      "A polished foot-care bundle for soft heels and clean, comfortable maintenance.",
    details: ["Foot soak", "Heel buffer", "Cooling foot cream"],
  },
  {
    id: "glow-event-add-on",
    name: "Glow Event Add-On",
    category: "Events",
    price: "$45",
    image: {
      src: "/images/lashes4.jpg",
      alt: "Beauty detail image used as a placeholder for event add-on product",
    },
    badge: "Group ready",
    description:
      "A small beauty table add-on for bridal mornings, birthdays, and spa parties.",
    details: ["Mini care cards", "Sanitized tools", "Guest-ready display"],
  },
  {
    id: "cloud-cleanse-lash-wash",
    name: "Cloud Cleanse Lash Wash",
    category: "Lashes",
    price: "$28",
    image: {
      src: "/images/lashes2.jpg",
      alt: "Lash service close-up used as a placeholder for lash wash product",
    },
    badge: "Aftercare",
    description:
      "A gentle lash wash placeholder for daily cleansing and fresh extension care.",
    details: ["Gentle cleanse", "Extension friendly", "Daily use"],
  },
  {
    id: "heel-balm",
    name: "Callus Heel Balm",
    category: "Feet",
    price: "$29.95",
    image: {
      src: "/images/pedicure2.jpg",
      alt: "Pedicure image used as a placeholder for heel balm product",
    },
    badge: "Foot care",
    description:
      "A rich heel balm placeholder for dry, cracked skin between pedicures.",
    details: ["Softens heels", "Night care", "Pedicure support"],
  },
  {
    id: "body-wash",
    name: "Mango Cleansing Gel",
    category: "Body",
    price: "$10.99",
    image: {
      src: "/images/Medicure1.jpg",
      alt: "Beauty service image used as a placeholder for cleansing gel",
    },
    badge: "New",
    description:
      "A bright cleansing gel placeholder for body care, shower sets, and gifting.",
    details: ["Fresh scent", "Body wash", "Gift friendly"],
  },
  {
    id: "cream-deodorant-floral",
    name: "Cream Deodorant Floral",
    category: "Body",
    price: "$14.99",
    image: {
      src: "/images/lashes4.jpg",
      alt: "Beauty detail image used as a placeholder for floral deodorant",
    },
    badge: "Daily care",
    description:
      "A compact body-care placeholder for everyday freshness with a soft floral finish.",
    details: ["Cream texture", "Daily wear", "Travel ready"],
  },
  {
    id: "lift-extreme",
    name: "Lift Extreme",
    category: "Skin Care",
    price: "$32",
    image: {
      src: "/images/lashes3.jpg",
      alt: "Beauty close-up used as a placeholder for skin care product",
    },
    badge: "Skin care",
    description:
      "A treatment-style placeholder for the skin care products shown in the old shop.",
    details: ["Treatment ampoule", "Focused care", "Appointment add-on"],
  },
  {
    id: "mens-body-wash",
    name: "Men's Energizing Body Wash",
    category: "Men",
    price: "$37",
    image: {
      src: "/images/pedicure1.jpg",
      alt: "Spa product placeholder image for men's body wash",
    },
    badge: "Men",
    description:
      "A men's care placeholder for shower routines, gifting, and spa party orders.",
    details: ["Energizing scent", "Shower care", "Gift option"],
  },
  {
    id: "lavender-hand-body-cream",
    name: "Lavender Hand & Body Cream",
    category: "Body",
    price: "$14.99",
    image: {
      src: "/images/Medicure1.jpg",
      alt: "Manicure image used as a placeholder for lavender hand and body cream",
    },
    badge: "New",
    description:
      "A calming moisturizer placeholder for hands, elbows, and dry skin care.",
    details: ["Lavender finish", "Hand care", "Body care"],
  },
  {
    id: "gift-basket",
    name: "Gift Basket",
    category: "Gifting",
    price: "$50",
    image: {
      src: "/images/lashes1.jpg",
      alt: "Lash image used as a placeholder for a beauty gift basket",
    },
    badge: "Gift",
    description:
      "A flexible gift basket placeholder for birthdays, bridal mornings, and events.",
    details: ["Custom mix", "Wrapped set", "Event friendly"],
  },
];

export const shopHighlights = [
  "Curated for appointments",
  "Easy local delivery",
  "Small-batch essentials",
];
