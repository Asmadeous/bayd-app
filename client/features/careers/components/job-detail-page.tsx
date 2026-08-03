"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Briefcase, CheckCircle2, MapPin, Upload, X } from "lucide-react"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { Button } from "@/components/ui/button"
import { useJob, useApplyToJob, EMPLOYMENT_LABELS } from "@/lib/hooks/use-jobs"

const MAX_BYTES = 5 * 1024 * 1024

export function JobDetailPage({ slug }: { slug: string }) {
  const { data: job, isLoading, isError } = useJob(slug)
  const apply = useApplyToJob(slug)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" })
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function onPickFiles(list: FileList | null) {
    setError(null)
    if (!list) return
    const picked = Array.from(list)
    const bad = picked.find((f) => f.type !== "application/pdf")
    if (bad) return setError("Only PDF files are accepted.")
    const tooBig = picked.find((f) => f.size > MAX_BYTES)
    if (tooBig) return setError("Each file must be under 5 MB.")
    if (picked.length > 3) return setError("Up to 3 files.")
    setFiles(picked)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (files.length === 0) return setError("Please attach your resume (PDF).")
    try {
      await apply.mutateAsync({ ...form, documents: files })
      setDone(true)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Something went wrong. Please try again.",
      )
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="bg-background text-[#101217]">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f6268] transition-colors hover:text-[#c96c83]"
          >
            <ArrowLeft className="size-4" /> All roles
          </Link>

          {isLoading ? (
            <p className="mt-10 text-sm text-[#5f6268]">Loading…</p>
          ) : isError || !job ? (
            <p className="mt-10 text-sm text-[#5f6268]">This role is no longer available.</p>
          ) : (
            <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
              {/* Role */}
              <div>
                <span className="bg-[#f0c8d3]/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#a36f4d]">
                  {EMPLOYMENT_LABELS[job.employment_type]}
                </span>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                  {job.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6268]">
                  {job.department && (
                    <span className="inline-flex items-center gap-1.5"><Briefcase className="size-3.5" /> {job.department}</span>
                  )}
                  {job.location && (
                    <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {job.location}</span>
                  )}
                </div>

                {job.description && (
                  <div className="mt-6">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#101217]">About the role</h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#4f535a]">{job.description}</p>
                  </div>
                )}
                {job.requirements && (
                  <div className="mt-6">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#101217]">Requirements</h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#4f535a]">{job.requirements}</p>
                  </div>
                )}
              </div>

              {/* Apply */}
              <div className="h-fit border border-black/10 bg-white p-6 lg:sticky lg:top-24">
                {done ? (
                  <div className="py-6 text-center">
                    <CheckCircle2 className="mx-auto size-12 text-[#c96c83]" />
                    <h2 className="mt-3 text-xl font-extrabold text-[#101217]">Application received</h2>
                    <p className="mt-2 text-sm text-[#5f6268]">
                      Thanks for applying. We review every submission and will reach out if it&apos;s a fit.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-lg font-extrabold text-[#101217]">Apply now</h2>
                    {(["name", "email", "phone"] as const).map((field) => (
                      <div key={field}>
                        <label className="mb-1 block text-xs font-medium capitalize text-[#5f6268]">
                          {field === "phone" ? "Phone (optional)" : field}
                        </label>
                        <input
                          type={field === "email" ? "email" : "text"}
                          required={field !== "phone"}
                          value={form[field]}
                          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                          className="h-10 w-full border border-black/15 px-3 text-sm focus:border-[#c96c83] focus:outline-none"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#5f6268]">Message (optional)</label>
                      <textarea
                        rows={3}
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        className="w-full resize-none border border-black/15 px-3 py-2 text-sm focus:border-[#c96c83] focus:outline-none"
                      />
                    </div>

                    {/* PDF upload */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#5f6268]">Resume (PDF, max 5 MB)</label>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => onPickFiles(e.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 border border-dashed border-black/25 px-3 py-3 text-sm font-semibold text-[#5f6268] hover:border-[#c96c83]"
                      >
                        <Upload className="size-4" /> Choose PDF{files.length ? "(s)" : ""}
                      </button>
                      {files.map((f) => (
                        <div key={f.name} className="mt-2 flex items-center justify-between bg-[#f4f1eb] px-3 py-1.5 text-xs text-[#101217]">
                          <span className="truncate">{f.name}</span>
                          <button type="button" onClick={() => setFiles((fs) => fs.filter((x) => x !== f))}>
                            <X className="size-3.5 text-[#5f6268]" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {error && <p className="text-xs text-[#d4754a]">{error}</p>}
                    <p className="text-[11px] leading-4 text-[#8a8d93]">
                      Uploads are scanned for security before our team can open them.
                    </p>

                    <Button
                      type="submit"
                      disabled={apply.isPending}
                      className="h-11 w-full rounded-none font-bold"
                      style={{ background: "#c96c83", border: "none", color: "#fff" }}
                    >
                      {apply.isPending ? "Submitting…" : "Submit application"}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
