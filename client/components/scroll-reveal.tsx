"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "motion/react";

import { cn } from "@/lib/utils";

type RevealElement = "a" | "article" | "div";
type RevealVariant =
  | "fade-up"
  | "fade-left"
  | "fade-right"
  | "scale-up"
  | "clip-up";

type ScrollRevealProps = {
  as?: RevealElement;
  children: ReactNode;
  className?: string;
  delay?: number;
  href?: string;
  once?: boolean;
  variant?: RevealVariant;
};

const revealVariants: Record<RevealVariant, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 34 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-left": {
    hidden: { opacity: 0, x: 42 },
    visible: { opacity: 1, x: 0 },
  },
  "fade-right": {
    hidden: { opacity: 0, x: -42 },
    visible: { opacity: 1, x: 0 },
  },
  "scale-up": {
    hidden: { opacity: 0, scale: 0.96, y: 24 },
    visible: { opacity: 1, scale: 1, y: 0 },
  },
  "clip-up": {
    hidden: { clipPath: "inset(18% 0 0 0)", opacity: 0, y: 38 },
    visible: { clipPath: "inset(0% 0 0 0)", opacity: 1, y: 0 },
  },
};

export function ScrollReveal({
  as = "div",
  children,
  className,
  delay = 0,
  href,
  once = true,
  variant = "fade-up",
}: ScrollRevealProps) {
  const MotionComponent =
    as === "a" ? motion.a : as === "article" ? motion.article : motion.div;

  return (
    <MotionComponent
      className={cn("will-change-transform", className)}
      href={as === "a" ? href : undefined}
      initial="hidden"
      transition={{
        delay: delay / 1000,
        duration: 0.72,
        ease: [0.16, 1, 0.3, 1],
      }}
      variants={revealVariants[variant]}
      viewport={{ amount: 0.22, margin: "0px 0px -12% 0px", once }}
      whileInView="visible"
    >
      {children}
    </MotionComponent>
  );
}
