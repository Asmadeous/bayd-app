import type { HomePageContent } from "@/features/home/types/home-content";

export function getHomePageContent(): HomePageContent {
  return {
    services: [
      {
        id: "nail-extensions",
        title: "Nail Extensions",
        description:
          "Biogel or polygel nail extensions with gel color, optional design, hand massage, and cuticle oil.",
        price: "$95+",
        duration: "90min",
        rating: "4.9",
        idealFor:
          "Clients who want added length, structure, color, and a finished nail design.",
        involved: [
          "Biogel or polygel extension system",
          "Gel color and optional nail design",
          "Hand massage and cuticle oil finish",
        ],
        image: {
          src: "/images/new-pics-for-the-ladies/gel-manicure-service-02.webp",
          alt: "A manicure service with a nail technician using an electric file",
        },
        gallery: [
          {
            src: "/images/new-pics-for-the-ladies/nail-technician-at-work-01.webp",
            alt: "A manicure service with a nail technician using an electric file",
          },
          {
            src: "/images/new-pics-for-the-ladies/finished-manicure-result-03.webp",
            alt: "A pedicure service being performed in a spa chair",
          },
        ],
      },
      {
        id: "manicures",
        title: "Manicures",
        description:
          "Classic manicures with soak, shaping, cuticle care, massage, polish, and cuticle oil.",
        price: "$60+",
        duration: "45min",
        rating: "4.8",
        idealFor:
          "Clients who want refreshed hands, tidy nails, and a clean polish finish.",
        involved: [
          "Soak, nail shaping, and cuticle care",
          "Hand massage with seasonal hand cream",
          "Polish application and cuticle oil finish",
        ],
        image: {
          src: "/images/new-pics-for-the-ladies/mobile-manicure-service-01.webp",
          alt: "A manicure service with a nail technician using an electric file",
        },
        gallery: [
          {
            src: "/images/new-pics-for-the-ladies/manicure-appointment-detail-01.webp",
            alt: "A manicure service with a nail technician using an electric file",
          },
          {
            src: "/images/new-pics-for-the-ladies/finished-manicure-result-01.webp",
            alt: "Close-up beauty service result",
          },
        ],
      },
      {
        id: "pedicure",
        title: "Pedicure",
        description:
          "A relaxing pedicure with soak, nail care, callus removal, sugar scrub, massage, and polish.",
        price: "$75+",
        duration: "60min",
        rating: "4.9",
        idealFor:
          "Clients who want comfortable foot care, smoothing, polish, and a refreshed finish.",
        involved: [
          "Soak, nail care, and callus removal",
          "Organic sugar scrub and massage",
          "Nail polish, shellac add-on, or paraffin add-on",
        ],
        image: {
          src: "/images/pedicure1.jpg",
          alt: "A client receiving a pedicure while seated in a spa robe",
        },
        gallery: [
          {
            src: "/images/pedicure1.jpg",
            alt: "A client receiving a pedicure while seated in a spa robe",
          },
          {
            src: "/images/pedicure2.jpg",
            alt: "A pedicure service being performed in a spa chair",
          },
        ],
      },
      {
        id: "massages",
        title: "Massages",
        description:
          "In-home wellness massages with hand-crafted massage oils and calming massage music.",
        price: "$120+",
        duration: "60min",
        rating: "4.8",
        idealFor:
          "Clients who want to relax at home after a stressful day and enjoy deep relaxation.",
        involved: [
          "Portable massage setup at your home",
          "Hand-crafted massage oils",
          "Relaxing music and one hour of guided calm",
        ],
        image: {
          src: "/images/massage.jpg",
          alt: "A client receiving a spa-style service while seated in a robe",
        },
        gallery: [
          {
            src: "/images/massage1.jpg",
            alt: "A client receiving a spa-style service while seated in a robe",
          },
          {
            src: "/images/massage2.jpg",
            alt: "A calm beauty treatment close-up",
          },
        ],
      },
      {
        id: "waxing",
        title: "Waxing",
        description:
          "Temporary hair removal using warm or cold wax applied to the skin and removed with unwanted hair.",
        price: "$45+",
        duration: "30min",
        rating: "4.7",
        idealFor:
          "Clients who want smooth skin and convenient hair removal at home.",
        involved: [
          "Skin prep and wax application",
          "Quick wax removal with unwanted hair",
          "Post-wax cleanup and skin calming finish",
        ],
        image: {
          src: "/images/new-pics-for-the-ladies/nail-technician-portrait-at-work-02.webp",
          alt: "A close-up beauty treatment image",
        },
        gallery: [
          {
            src: "/images/new-pics-for-the-ladies/nail-technician-portrait-at-work-01.webp",
            alt: "A close-up beauty treatment image",
          },
          {
            src: "/images/new-pics-for-the-ladies/nail-technician-portrait-at-work-03.webp",
            alt: "A smiling client with under-eye pads during lash care",
          },
        ],
      },
      {
        id: "gel-x-nails",
        title: "Gel X Nails",
        description:
          "Soft gel nail extensions applied with gel polish and cured under UV or LED light.",
        price: "$110+",
        duration: "90min",
        rating: "4.9",
        idealFor:
          "Clients who want lightweight, flexible, natural-looking nail extensions without strong chemical odors.",
        involved: [
          "Pre-shaped soft gel tips applied to natural nails",
          "Gel layers built to create length and shape",
          "Curing under UV or LED lamp with gel polish finish",
        ],
        image: {
          src: "/images/new-pics-for-the-ladies/gel-manicure-service-01.webp",
          alt: "A manicure service with a nail technician using an electric file",
        },
        gallery: [
          {
            src: "/images/new-pics-for-the-ladies/gel-manicure-service-02.webp",
            alt: "A manicure service with a nail technician using an electric file",
          },
          {
            src: "/images/new-pics-for-the-ladies/finished-manicure-result-02.webp",
            alt: "A pedicure service being performed in a spa chair",
          },
        ],
      },
      {
        id: "lashes",
        title: "Lashes",
        description:
          "Mobile lash services including classic, hybrid, volume, mega volume, lash lift, tint, removal, and refills.",
        price: "$85+",
        duration: "60min",
        rating: "4.9",
        idealFor:
          "Clients who want natural definition, dramatic fullness, low-maintenance tint, or safe lash removal.",
        involved: [
          "Classic, hybrid, volume, or mega volume lash options",
          "Lash lift and tint for natural lashes",
          "Removal and 2-3 week refill services",
        ],
        image: {
          src: "/images/new-pics-for-the-ladies/mobile-lash-appointment-01.webp",
          alt: "A smiling client with under-eye pads during lash care",
        },
        gallery: [
          {
            src: "/images/new-pics-for-the-ladies/mobile-lash-appointment-02.webp",
            alt: "A smiling client with under-eye pads during lash care",
          },
          {
            src: "/images/new-pics-for-the-ladies/mobile-lash-appointment-01.webp",
            alt: "A before and after lash extension close-up",
          },
        ],
      },
    ],
    benefits: [
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
    ],
  };
}
