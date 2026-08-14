import type { PriceCategory } from "@/features/pricing/types";

export const pricingCategories: PriceCategory[] = [
  {
    id: "nails",
    title: "Nails",
    summary: "Gel, shellac, refills, polish changes, and hand care.",
    accent: "bg-white/80",
    items: [
      { name: "Bio Gel", price: "$70" },
      { name: "Gel X", price: "$80" },
      { name: "Manicure", price: "$40" },
      { name: "Shellac manicure", price: "$45" },
      { name: "Paraffin add-on", price: "$20" },
      { name: "Bio Gel refill", price: "$55" },
      { name: "French manicure", price: "$40" },
      { name: "French shellac manicure", price: "$45" },
      { name: "Polish change", price: "$30" },
      { name: "Full set nails", price: "$70" },
      { name: "Gel overlay", price: "$50" },
      { name: "Gel removal", price: "$30" },
      { name: "Manicure & pedicure", price: "$80" },
      { name: "Nail clip and file", price: "$55" },
      { name: "Nail refill", price: "$55" },
      { name: "Princess manicure (kids)", price: "$25" },
      { name: "Princess manicure & pedicure", price: "$50" },
      { name: "Shellac manicure & pedicure", price: "$85" },
      { name: "Shellac polish change", price: "$35" },
    ],
  },
  {
    id: "massages",
    title: "Massages",
    summary: "Focused body work and relaxation services brought home.",
    accent: "bg-white/80",
    items: [
      { name: "30 min Back", price: "$50" },
      { name: "45 min Thai foot massage", price: "$70" },
      { name: "60 min Body massage", price: "$95" },
      { name: "Body scrub", price: "$50" },
      { name: "Shoulder massage (20 mins)", price: "$40" },
      { name: "Swedish deep tissue massage", price: "$95" },
      { name: "Deep tissue massage with cupping", price: "$190" },
    ],
  },
  {
    id: "feet",
    title: "Feet",
    summary: "Pedicures, foot care, polish, and comfort-focused add-ons.",
    accent: "bg-white/80",
    items: [
      { name: "Pedicure starting at", price: "$50" },
      { name: "Paraffin add-on", price: "$20" },
      { name: "French Pedicure", price: "$55" },
      { name: "Polish Change", price: "$25" },
      { name: "Princess Pedicure (kids)", price: "$40" },
      { name: "Shellac pedicure", price: "$55" },
      { name: "Nail clip & file", price: "$20" },
      { name: "Medical Pedicure", price: "$75" },
      { name: "Jelly pedicure", price: "$75" },
      { name: "Signature spa manicure", price: "$65" },
    ],
  },
  {
    id: "waxing",
    title: "Waxing",
    summary: "Face and body waxing options for at-home appointments.",
    accent: "bg-white/80",
    items: [
      { name: "Eyebrows & shaping", price: "$20" },
      { name: "Chin & upper lip", price: "$20" },
      { name: "Half arm", price: "$25" },
      { name: "Half leg", price: "$35" },
      { name: "Full leg & bikini", price: "$80" },
      { name: "Bikini", price: "$36" },
      { name: "Upper lip", price: "$10" },
      { name: "Full face", price: "$35" },
      { name: "Full arm", price: "$40" },
      { name: "Full leg", price: "$55" },
      { name: "Under arm", price: "$30" },
      { name: "Brazilian", price: "$75" },
      { name: "Back", price: "$35" },
      { name: "Full body (women only)", price: "$175" },
      { name: "Full face", price: "$35" },
    ],
  },
  {
    id: "lashes",
    title: "Lashes",
    summary: "Classic, hybrid, volume, glam, and mega volume sets.",
    accent: "bg-white/80",
    items: [
      { name: "Classic Set", price: "$135" },
      { name: "Refill Classic", price: "$80" },
      { name: "Lash set Hybrid", price: "$155" },
      { name: "Refill Hybrid", price: "$90" },
      { name: "Lash Set Volume", price: "$160" },
      { name: "Refill Volume", price: "$100" },
      { name: "Lash Set Glam Volume", price: "$170" },
      { name: "Refill Glam Volume", price: "$110" },
      { name: "Lash Set Mega Volume", price: "$225" },
      { name: "Refill Mega Volume", price: "$140" },
    ],
  },
];

// Facials are advertised as a range of options rather than discrete bookable
// services, so they live here as static data (there is no DB equivalent). The
// live /services page appends this section after the API-driven categories.
export const FACIAL_SERVICES: PriceCategory = {
  id: "facials",
  title: "Facial Services",
  summary:
    "Personalized facial care, targeted treatments, and relaxation-focused options.",
  accent: "bg-white/80",
  items: [
    {
      name: "Basic / Express Facial",
      duration: "30–60 min",
      price: "$80–$150",
      description:
        "A cleansing, exfoliating, and hydrating facial that refreshes the skin — a great introduction or a quick reset between fuller treatments.",
    },
    {
      name: "Signature / Hydrating Facial",
      duration: "60–90 min",
      price: "$120–$200",
      description:
        "A deeply nourishing facial that cleanses, exfoliates, and replenishes moisture for a smooth, radiant, well-rested glow.",
    },
    {
      name: "Anti-Aging / Collagen-Boosting Facial",
      duration: "60–90 min",
      price: "$150–$250+",
      description:
        "A targeted anti-ageing facial that firms, smooths, and boosts collagen to soften the look of fine lines and restore youthful vitality.",
    },
    {
      name: "Acne / Problem Skin Facial",
      duration: "60–90 min",
      price: "$140–$230",
      description:
        "A deep-cleansing facial for blemish-prone skin that clears congestion, calms breakouts, and supports a clearer, healthier complexion.",
    },
    {
      name: "Brightening / Glow Facial",
      duration: "60–90 min",
      price: "$130–$220",
      description:
        "A brightening facial that targets dullness and uneven tone to reveal a fresh, luminous, even glow.",
    },
    {
      name: "Sensitive / Soothing Facial",
      duration: "60–90 min",
      price: "$120–$200",
      description:
        "A gentle, calming facial formulated for sensitive skin that soothes redness and irritation while restoring comfort and balance.",
    },
    {
      name: "Chemical Peel (Light / Superficial)",
      duration: "30–60 min",
      price: "$100–$200+",
      description:
        "A light chemical peel that gently resurfaces the skin to improve tone and texture and reveal a brighter, smoother complexion.",
    },
    {
      name: "Back Facial",
      duration: "45–75 min",
      price: "$130–$210",
      description:
        "A cleansing and exfoliating treatment for the back that clears congestion and leaves hard-to-reach skin smooth and refreshed.",
    },
    {
      name: "Relaxation Massage (Full Body or Targeted)",
      duration: "30–90 min",
      price: "$80–$180",
      description:
        "A soothing massage, full-body or focused on a target area, to release tension and leave you deeply relaxed.",
    },
    {
      name: "Facial Massage (Add-on or Standalone)",
      duration: "20–45 min",
      price: "$50–$120",
      description:
        "A relaxing facial massage that eases tension, boosts circulation, and leaves the face lifted and glowing — as an add-on or on its own.",
    },
  ],
};
