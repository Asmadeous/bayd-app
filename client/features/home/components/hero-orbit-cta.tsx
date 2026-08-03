"use client";

import { ArrowUpRight } from "lucide-react";

export function HeroOrbitCta() {
  return (
    <a
      aria-label="Explore our services"
      className="group relative hidden size-36 shrink-0 items-center justify-center rounded-full border border-[#101217]/45 text-[#101217] transition-transform hover:scale-105 lg:flex"
      href="#services"
    >
      <svg
        aria-hidden="true"
        className="absolute inset-2 animate-[spin_18s_linear_infinite]"
        viewBox="0 0 100 100"
      >
        <defs>
          <path
            d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
            id="hero-orbit-path"
          />
        </defs>
        <text className="fill-[#101217] text-[9px] font-bold uppercase tracking-[0.28em]">
          <textPath href="#hero-orbit-path" startOffset="0">
            Explore Our Services • Explore Our Services •
          </textPath>
        </text>
      </svg>
      <span className="grid size-14 place-items-center rounded-full bg-[#17202a] text-white transition-colors group-hover:bg-[#c96c83]">
        <ArrowUpRight aria-hidden="true" className="size-5" />
      </span>
    </a>
  );
}
