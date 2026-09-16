"use client";

import Image from "next/image";

import { ScrollReveal } from "@/components/scroll-reveal";

const teamMembers = [
  {
    name: "Susi",
    initials: "SU",
    role: "CEO, Nail Technician & Massage Spa Specialist",
    location: "Beauty @ Your Door",
    bio: "Susi is CEO of Beauty @ Your Door, a nail technician and massage spa business owner with more than 24 years of beauty industry experience. She is passionate about creating a relaxing, comfortable atmosphere where clients can unwind and leave their cares outside.",
    accent: "#f0c8d3",
    backgroundImage:
      "/images/new-pics-for-the-ladies/susi-team-portrait-01.webp",
    profileImage: "/images/new-pics-for-the-ladies/susi-team-headshot.webp",
  },
  {
    name: "Claire",
    initials: "CL",
    role: "Certified Eyelash Extension Technician & Coach",
    location: "Canada & Europe trained",
    bio: "Claire has worked in eyelash extensions and coaching since 2009, with extensive international experience across Europe and Canada. She is skilled in all types of eyelash extensions and creates styles tailored to each client.",
    accent: "#e3d97b",
    backgroundImage: "/images/new-pics-for-the-ladies/claire-team-headshot.webp",
    profileImage: "/images/new-pics-for-the-ladies/claire-team-profile.webp",
    backgroundPosition: "center 42%",
    profilePosition: "center",
  },
  {
    name: "Vanessa",
    initials: "VA",
    role: "Certified Nail Technician & Medical Pedicurist",
    location: "Serving Brampton only",
    bio: "Vanessa specializes in medical pedicures and advanced foot care. She helps clients feel confident and comfortable from the toes up, supporting common foot concerns like calluses, ingrown nails, thickened nails, dry skin, and cracked heels.",
    accent: "#c9b7d4",
    backgroundImage:
      "/images/new-pics-for-the-ladies/vanessa-team-portrait-01.webp",
    profileImage: "/images/new-pics-for-the-ladies/vanessa-team-headshot.webp",
  },
  {
    name: "Rim",
    initials: "RI",
    role: "Medical Aesthetician",
    location: "15 years of aesthetics experience",
    bio: "Rim believes beautiful skin starts with personalized care. Her passion for aesthetics spans 15 years, during which she built a successful career in Kuwait helping clients achieve their ultimate skin goals. After relocating to Canada, she advanced her expertise with a Canadian diploma in Medical Aesthetics. Known for her warm approach, thorough consultations, and ability to make clients feel completely at ease, Rim supports advanced skin rejuvenation, preventative skincare routines, and relaxing massage.",
    accent: "#d8c7b8",
    backgroundImage: "/images/new-pics-for-the-ladies/rim-team-headshot.webp",
    profileImage: "/images/new-pics-for-the-ladies/rim-team-headshot.webp",
    backgroundPosition: "center 35%",
    profilePosition: "center 38%",
  },
];

export function TeamSection() {
  return (
    <section className="bg-[#f4f1eb] py-24" id="team">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal
          className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
          variant="fade-up"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#a36f4d]">
              Our Team
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-[#101217] sm:text-5xl">
              Meet the professionals bringing beauty services to your door.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[#62666d]">
            A mobile team with deep experience in nails, lashes, pedicure care,
            medical aesthetics, massage, and client-first service across home
            and event bookings.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {teamMembers.map((member, index) => (
            <ScrollReveal
              as="article"
              className="group border border-black/10 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10"
              delay={index * 90}
              key={member.name}
              variant="scale-up"
            >
              <div
                className="relative flex aspect-[4/3] items-end overflow-hidden p-6"
                style={{
                  background: `linear-gradient(135deg, ${member.accent}, #f8f3ef 68%)`,
                }}
              >
                {member.backgroundImage && (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    fill
                    quality={96}
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                    src={member.backgroundImage}
                    style={{
                      objectPosition: member.backgroundPosition ?? "center",
                    }}
                  />
                )}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `linear-gradient(135deg, ${member.accent}, #f8f3ef 88%)`,
                  }}
                />
                <div className="absolute -right-10 -top-14 size-48 bg-white/15 blur-2xl" />
                <div className="absolute bottom-0 right-0 text-[9rem] font-extrabold leading-none text-[#101217]/[0.05] transition-transform group-hover:scale-105">
                  {member.initials}
                </div>
                <div className="relative flex size-28 items-center justify-center overflow-hidden border-2 border-white/90 bg-white/75 text-2xl font-extrabold text-[#101217] shadow-xl">
                  {member.profileImage ? (
                    <Image
                      alt={`${member.name}, ${member.role}`}
                      className="object-cover"
                      fill
                      quality={100}
                      sizes="224px"
                      src={member.profileImage}
                      style={{
                        objectPosition: member.profilePosition ?? "center",
                      }}
                      unoptimized
                    />
                  ) : (
                    member.initials
                  )}
                </div>
              </div>

              <div className="p-6">
                <div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-[#101217]">
                      {member.name}
                    </h3>
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em] text-[#a36f4d]">
                      {member.role}
                    </p>
                  </div>
                </div>

                <div className="mt-5 text-sm font-semibold text-[#62666d]">
                  {member.location}
                </div>

                <p className="mt-5 text-sm leading-6 text-[#4f535a]">
                  {member.bio}
                </p>

                <div className="mt-6 border-t border-black/10 pt-4 text-sm font-bold text-[#101217]">
                  Experienced Beauty Professional
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal
          className="mt-5 border border-black/10 bg-white/70 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8"
          variant="fade-up"
        >
          <div>
            <h3 className="text-2xl font-extrabold text-[#101217]">
              Interested in joining the mobile team?
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#62666d]">
              We are always open to reliable beauty professionals who enjoy
              prepared, polished, client-focused mobile work.
            </p>
          </div>
          <a
            className="mt-5 inline-flex h-12 items-center justify-center bg-[#101217] px-6 text-sm font-bold text-white transition-colors hover:bg-[#c96c83] sm:mt-0"
            href="#contact"
          >
            Ask About Opportunities
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
