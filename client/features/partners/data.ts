export type PartnerProductFocus = {
  title: string;
  description: string;
};

export type PartnerHighlight = {
  label: string;
  value: string;
};

export type Partner = {
  name: string;
  eyebrow: string;
  url: string;
  logoSrc: string;
  logoWidth: number;
  logoHeight: number;
  summary: string;
  description: string;
  accent: string;
  productFocus: PartnerProductFocus[];
  highlights: PartnerHighlight[];
};

export const partners: Partner[] = [
  {
    name: "Mary Kay",
    eyebrow: "Beauty partner",
    url: "https://www.marykay.ca/",
    logoSrc:
      "https://www.marykay.ca/on/demandware.static/Sites-marykay-ca-Site/-/default/dw9aedc764/images/logo.svg",
    logoWidth: 256,
    logoHeight: 96,
    summary:
      "A beauty brand known for skin care, makeup, and consultant-led product guidance.",
    description:
      "BAYD partners with Mary Kay to support thoughtful beauty routines before, during, and after mobile appointments. The partnership gives clients a simple way to explore polished skin care and makeup options that fit their goals.",
    accent: "#e43d79",
    productFocus: [
      {
        title: "Skin care",
        description:
          "Daily regimen options, cleansers, moisturizers, and targeted care for different skin goals.",
      },
      {
        title: "Makeup",
        description:
          "Colour, complexion, and finishing products that help complete a service-ready look.",
      },
      {
        title: "Beauty routines",
        description:
          "Personal recommendations that can pair naturally with facials, events, and ongoing self-care.",
      },
    ],
    highlights: [
      {
        label: "Founded",
        value: "1963",
      },
      {
        label: "Focus",
        value: "Skin care and makeup",
      },
      {
        label: "Experience",
        value: "Consultant-led beauty",
      },
    ],
  },
];

export const featuredPartner = partners[0];
