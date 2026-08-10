export const siteConfig = {
  name: "Beauty @ Your Door",
  shortName: "BAYD",
  domain: "baydspa.ca",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://baydspa.ca",
  tagline: "Beauty at your door. We'll come to you.",
  description:
    "Women-only mobile beauty services across Toronto, Mississauga, Brampton, and neighbouring west end GTA communities. Book nails, lashes, massage, facials, waxing, pedicure, manicure, and event beauty services at home, work, hotels, and private gatherings.",
  phone: "+1 (647) 970-8259",
  phoneHref: "+16479708259",
  email: "Bookings@baydspa.ca",
  serviceAreas: [
    "Mississauga",
    "Brampton",
    "Etobicoke",
    "West Toronto",
    "Oakville",
    "Milton",
  ],
  socialLinks: {
    instagram:
      "https://www.instagram.com/beauty_at_your.door?igsh=M3F6bG5mbnU4cmY1",
    pinterest: "https://pin.it/7sMJvecii",
    tiktok: "https://www.tiktok.com/@beauty_at_your_door?_r=1&_t=ZS-98exCC4wIM6",
  },
  assets: {
    logo: "/images/brand/bayd-logo-black.png",
    ogImage: "/images/seo/og-default.png",
    twitterImage: "/images/seo/twitter-default.png",
  },
} as const;
