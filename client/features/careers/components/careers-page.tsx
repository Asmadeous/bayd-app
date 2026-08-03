"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Briefcase, MapPin } from "lucide-react"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { ScrollReveal } from "@/components/scroll-reveal"
import {
  useJobs,
  EMPLOYMENT_LABELS,
  type EmploymentType,
  type JobPosting,
} from "@/lib/hooks/use-jobs"

const FILTERS: Array<{ value: "all" | EmploymentType; label: string }> = [
  { value: "all", label: "All roles" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
]

export function CareersPage() {
  const [filter, setFilter] = useState<"all" | EmploymentType>("all")
  const { data: jobs = [], isLoading } = useJobs()

  const visible = useMemo(
    () => (filter === "all" ? jobs : jobs.filter((j) => j.employment_type === filter)),
    [jobs, filter],
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="bg-[#f4f1eb] text-[#101217]">
          <div className="mx-auto w-full max-w-[1760px] px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16 2xl:px-10">
            <ScrollReveal variant="fade-right">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">Careers</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
                Build your beauty career with us.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a] sm:text-lg">
                We&apos;re a mobile beauty team bringing salon-quality service to clients&apos; doors.
                Browse open roles and apply in minutes.
              </p>
            </ScrollReveal>
          </div>
        </section>

        <section className="bg-background py-14 text-[#101217] sm:py-20">
          <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
            <div className="flex max-w-full gap-2 overflow-x-auto border-b border-black/10 pb-4">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className="shrink-0 border border-black/10 px-4 py-2 text-sm font-semibold transition-colors"
                  style={
                    filter === f.value
                      ? { background: "#c96c83", color: "#fff" }
                      : { background: "#f4f1eb", color: "#5f6268" }
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <p className="mt-10 text-sm text-[#5f6268]">Loading roles…</p>
            ) : visible.length === 0 ? (
              <p className="mt-10 text-sm text-[#5f6268]">
                No open roles right now — check back soon.
              </p>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((job, i) => (
                  <ScrollReveal key={job.id} delay={(i % 3) * 70} variant="scale-up">
                    <JobCard job={job} />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function JobCard({ job }: { job: JobPosting }) {
  return (
    <Link
      href={`/careers/${job.slug}`}
      className="group flex h-full flex-col border border-black/10 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
    >
      <div>
        <span className="bg-[#f0c8d3]/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#a36f4d]">
          {EMPLOYMENT_LABELS[job.employment_type]}
        </span>
      </div>
      <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-[#101217]">
        {job.title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6268]">
        {job.department && (
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="size-3.5" /> {job.department}
          </span>
        )}
        {job.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {job.location}
          </span>
        )}
      </div>
      {job.description && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#5f6268]">{job.description}</p>
      )}
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#101217] transition-colors group-hover:text-[#c96c83]">
        View role &amp; apply
      </span>
    </Link>
  )
}
