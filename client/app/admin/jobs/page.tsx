"use client"

import { useState } from "react"
import { Download, Lock, Plus } from "lucide-react"

import { HireApplicantButton } from "@/components/dashboard/hire-applicant-button"
import { JobPostingEditor, ScanBadge } from "@/components/dashboard/job-posting-editor"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import {
  downloadApplicationDocument,
  useAdminJobApplications,
  useAdminJobPostings,
  useDeleteJobPosting,
  useUpdateApplicationStatus,
  type AdminJobPosting,
} from "@/lib/hooks/use-admin"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, FilterChips } from "../ui"

const TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
}
const TABS = ["postings", "applications"] as const
const POSTING_FILTERS = ["", "draft", "published", "closed"] as const
const APP_STATUSES = ["unread", "reviewing", "rejected", "hired"] as const
const APP_FILTERS = ["", ...APP_STATUSES] as const

// The web Jobs page: postings (create, edit, delete) and applications (hire,
// status, documents).
export default function AdminJobsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("postings")
  const [editing, setEditing] = useState<Partial<AdminJobPosting> | null>(null)

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Jobs"
        action={
          tab === "postings" ? (
            <button
              type="button"
              onClick={() => setEditing({ employment_type: "full_time", status: "draft" })}
              className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white"
            >
              <Plus className="size-4" aria-hidden /> New
            </button>
          ) : undefined
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Manage job postings and applications.</p>
      {editing ? <JobPostingEditor initial={editing} onClose={() => setEditing(null)} /> : null}

      <div className="space-y-3 px-5">
        <div className="grid grid-cols-2 rounded-xl bg-black/5 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-10 rounded-lg text-sm font-bold capitalize ${tab === t ? "bg-white shadow-sm" : mutedClass}`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "postings" ? <Postings onEdit={setEditing} /> : <Applications />}
      </div>
    </div>
  )
}

function Postings({ onEdit }: { onEdit: (posting: AdminJobPosting) => void }) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const [status, setStatus] = useState<(typeof POSTING_FILTERS)[number]>("")
  const { data, isLoading } = useAdminJobPostings({ status: status || undefined })
  const del = useDeleteJobPosting()
  const postings = data?.data ?? []

  async function remove(p: AdminJobPosting) {
    const ok = await confirm({
      title: "Delete job posting?",
      message: `This removes "${p.title}" from the job board. Existing applications remain in the system.`,
      confirmLabel: "Delete posting",
      tone: "danger",
    })
    if (!ok) return
    del.mutate(p.id, {
      onSuccess: () => toast({ title: "Posting deleted", description: `${p.title} was removed.`, variant: "success" }),
      onError: (e) => toast({ title: "Posting not deleted", description: apiError(e, "Could not delete this job posting."), variant: "error" }),
    })
  }

  return (
    <>
      <FilterChips options={POSTING_FILTERS} value={status} onChange={setStatus} label={(s) => s || "all"} />
      {isLoading ? (
        <p className={`text-sm ${mutedClass}`}>Loading…</p>
      ) : postings.length === 0 ? (
        <EmptyCard title="No postings yet" body="Create a job posting to start collecting applications." />
      ) : (
        postings.map((p) => (
          <section key={p.id} className={`${cardClass} p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold">{p.title}</span>
              <StatusBadgeFor status={p.status} />
            </div>
            <p className={`mt-1 text-sm ${mutedClass}`}>
              {[TYPE_LABEL[p.employment_type], p.department, p.location].filter(Boolean).join(" · ")}
              {p.applications_count != null ? ` · ${p.applications_count} application${p.applications_count === 1 ? "" : "s"}` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => onEdit(p)} className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold">
                Edit
              </button>
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => remove(p)}
                className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#8f3f4b] disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </section>
        ))
      )}
    </>
  )
}

function Applications() {
  const { toast } = useToast()
  const [status, setStatus] = useState<(typeof APP_FILTERS)[number]>("")
  const { data, isLoading } = useAdminJobApplications({ status: status || undefined })
  const updateStatus = useUpdateApplicationStatus()
  const apps = data?.data ?? []

  function setAppStatus(id: number, next: string) {
    updateStatus.mutate(
      { id, status: next },
      {
        onSuccess: () => toast({ title: "Application status updated", variant: "success" }),
        onError: (e) => toast({ title: "Application status not updated", description: apiError(e, "Could not update this application."), variant: "error" }),
      },
    )
  }

  async function download(path: string, filename: string) {
    try {
      await downloadApplicationDocument(path, filename)
    } catch (e) {
      toast({ title: "Document not downloaded", description: apiError(e, "This document is not available for download yet."), variant: "error" })
    }
  }

  return (
    <>
      <FilterChips options={APP_FILTERS} value={status} onChange={setStatus} label={(s) => s || "all"} />
      {isLoading ? (
        <p className={`text-sm ${mutedClass}`}>Loading…</p>
      ) : apps.length === 0 ? (
        <EmptyCard title="No applications yet" body="Applications matching this filter will appear here." />
      ) : (
        apps.map((a) => (
          <section key={a.id} className={`${cardClass} space-y-2 p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold">{a.name}</span>
              <ScanBadge status={a.scan_status} />
            </div>
            {a.job_title ? <p className="text-sm font-bold text-[#a36f4d]">{a.job_title}</p> : null}
            <p className={`text-sm ${mutedClass}`}>
              <a href={`mailto:${a.email}`} className="break-all">
                {a.email}
              </a>
              {a.phone ? (
                <>
                  {" · "}
                  <a href={`tel:${a.phone}`}>{a.phone}</a>
                </>
              ) : null}
              {" · "}
              {formatBookingDate(a.created_at, { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {a.message ? <p className="text-sm">{a.message}</p> : null}
            {a.documents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {a.documents.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!d.downloadable}
                    onClick={() => download(d.download_path, d.filename)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 text-xs font-semibold disabled:opacity-50"
                  >
                    {d.downloadable ? <Download className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                    {d.filename}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <select
                aria-label="Application status"
                disabled={updateStatus.isPending}
                value={a.status}
                onChange={(e) => setAppStatus(a.id, e.target.value)}
                className="h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold capitalize outline-none"
              >
                {APP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <HireApplicantButton application={a} />
            </div>
          </section>
        ))
      )}
    </>
  )
}
