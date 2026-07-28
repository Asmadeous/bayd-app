import { CalendarCheck, Gem, ShoppingBag } from "lucide-react";

import type { AuthBenefit, AuthPageContent } from "@/features/auth/types";

export const authBenefits: AuthBenefit[] = [
  {
    icon: CalendarCheck,
    label: "Manage bookings",
  },
  {
    icon: ShoppingBag,
    label: "Save beauty products",
  },
  {
    icon: Gem,
    label: "Track loyalty perks",
  },
];

const sharedHero = {
  badge: "Beauty Member Access",
  image: {
    src: "/images/lashes3.jpg",
    alt: "Close-up beauty service result used as an auth page background",
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
      text: "New to Beauty at Your Door?",
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
      {
        autoComplete: "current-password",
        label: "Password",
        name: "password",
        placeholder: "Enter your password",
        type: "password",
      },
    ],
    forgotPasswordHref: "/forgot-password",
    hero: sharedHero,
    mode: "signin",
    primaryAction: "Sign in",
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
        autoComplete: "new-password",
        label: "Password",
        name: "password",
        placeholder: "Create a password",
        type: "password",
      },
    ],
    hero: {
      ...sharedHero,
      image: {
        src: "/images/nails1.jpg",
        alt: "Manicure service used as an auth page background",
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
        src: "/images/massage.jpg",
        alt: "Pedicure service used as an auth page background",
      },
    },
    mode: "forgot",
    primaryAction: "Send reset link",
    supportText:
      "Enter the email connected to your account and we will send password reset instructions.",
    title: "Reset your password.",
  },
};
