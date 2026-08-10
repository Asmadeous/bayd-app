import type { AuthPageContent } from "@/features/auth/types";

const sharedHero = {
  badge: "Beauty Member Access",
  image: {
    src: "/images/new-pics-for-the-ladies/nail-polish-application-close-up.webp",
    alt: "Nail polish application used as a sign-in page background",
  },
  metrics: [
    {
      label: "Mobile appointments",
      value: "GTA",
    },
    {
      label: "Services and shop",
      value: "One place",
    },
  ],
  note: "Keep appointments, product preferences, and beauty care notes connected to your account.",
  title: "Your mobile beauty routine, organized around you.",
};

export const authPages: Record<
  "forgot" | "signin" | "signup",
  AuthPageContent
> = {
  signin: {
    alternateAction: {
      href: "/signup",
      label: "Create account",
      text: "New to Beauty @ Your Door?",
    },
    eyebrow: "Sign in",
    fields: [
      {
        autoComplete: "email",
        label: "Email address",
        name: "email",
        placeholder: "you@example.com",
        type: "email",
      },
    ],
    hero: sharedHero,
    mode: "signin",
    primaryAction: "Continue with email",
    supportText:
      "Access booking requests, saved products, loyalty notes, and appointment preferences.",
    title: "Welcome back to your beauty account.",
  },
  signup: {
    alternateAction: {
      href: "/signin",
      label: "Sign in",
      text: "Already have an account?",
    },
    eyebrow: "Create account",
    fields: [
      {
        autoComplete: "name",
        label: "Full name",
        name: "name",
        placeholder: "Your full name",
        type: "text",
      },
      {
        autoComplete: "email",
        label: "Email address",
        name: "email",
        placeholder: "you@example.com",
        type: "email",
      },
      {
        autoComplete: "tel",
        label: "Phone",
        name: "phone",
        placeholder: "(416) 555-0123",
        type: "text",
      },
    ],
    hero: {
      ...sharedHero,
      image: {
        src: "/images/new-pics-for-the-ladies/mobile-manicure-service-05.webp",
        alt: "Mobile manicure service used as a sign-up page background",
      },
    },
    mode: "signup",
    primaryAction: "Create account",
    supportText:
      "Create a profile for service planning, shop preferences, and future member rewards.",
    title: "Start your beauty profile.",
  },
  forgot: {
    alternateAction: {
      href: "/signin",
      label: "Back to sign in",
      text: "Remembered your password?",
    },
    eyebrow: "Password help",
    fields: [
      {
        autoComplete: "email",
        label: "Email address",
        name: "email",
        placeholder: "you@example.com",
        type: "email",
      },
    ],
    hero: {
      ...sharedHero,
      image: {
        src: "/images/new-pics-for-the-ladies/mobile-manicure-appointment-01.webp",
        alt: "Mobile manicure appointment used as a password reset page background",
      },
    },
    mode: "forgot",
    primaryAction: "Send reset link",
    supportText:
      "Enter the email connected to your account and we will send password reset instructions.",
    title: "Reset your password.",
  },
};
