"use client"

import { useState } from "react"
import { Download, Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import {
  useAdminJobPostings,
  useSaveJobPosting,
  useDeleteJobPosting,
  useAdminJobApplications,
  useUpdateApplicationStatus,
  useDeleteApplication,
  downloadApplicationDocument,
  type AdminJobPosting,
} from "@/lib/hooks/use-admin"

const TYPES = ["full_time", "part_time", "contract", "temporary", "internship"]
const TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", temporary: "Temporary", internship: "Internship",
}
const APP_STATUSES = ["unread", "reviewing", "rejected", "hired"]

type Blank = Partial<AdminJobPosting>

export default function AdminJobsPage() {
  const [tab, setTab] = useState<"postings" | "applications">("postings")

  return (
    <div className="space-y-6">
      <DashboardHeader title="Jobs" subtitle="Manage job postings and applications" />
      <div className="flex gap-2">
        {(["postings", "applications"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors"
            style={tab === t ? { background: "#c96c83", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "postings" ? <PostingsTab /> : <ApplicationsTab />}
    </div>
  )
}

function PostingsTab() {
  const [status, setStatus] = useState("")
  const { data, isLoading } = useAdminJobPostings({ status: status || undefined })
  const save = useSaveJobPosting()
  const del = useDeleteJobPosting()
  const [editing, setEditing] = useState<Blank | null>(null)

  const postings = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {["", "draft", "published", "closed"].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors"
              style={status === s ? { background: "#101217", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}
            >
              {s || "all"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setEditing({ employment_type: "full_time", status: "draft" })} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          <Plus className="size-4" /> New posting
        </Button>
      </div>

      {editing && (
        <PostingForm
          posting={editing}
          saving={save.isPending}
          onCancel={() => setEditing(null)}
          onSave={async (data) => { await save.mutateAsync(data); setEditing(null) }}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-[#5f6268]">Loading…</p>
      ) : postings.length === 0 ? (
        <p className="rounded-xl border border-black/8 bg-white px-5 py-10 text-center text-sm text-[#5f6268]">No postings yet.</p>
      ) : (
        <div className="space-y-3">
          {postings.map((p) => (
            <div key={p.id} className="rounded-xl border border-black/8 bg-white px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[#101217]">{p.title}</span>
                  <Badge label={p.status} kind={p.status} />
                  <span className="text-xs text-[#5f6268]">{TYPE_LABEL[p.employment_type]}</span>
                </div>
                <p className="text-xs text-[#5f6268] mt-0.5">
                  {[p.department, p.location].filter(Boolean).join(" · ")}
                  {p.applications_count != null && ` · ${p.applications_count} application${p.applications_count === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="xs" variant="outline" onClick={() => setEditing(p)}><Pencil className="size-3.5" /></Button>
                <Button size="xs" variant="outline" onClick={() => { if (confirm("Delete this posting?")) del.mutate(p.id) }}><Trash2 className="size-3.5 text-[#d4754a]" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PostingForm({ posting, saving, onSave, onCancel }: {
  posting: Blank
  saving: boolean
  onSave: (data: Blank & { id?: number }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Blank>(posting)
  const set = (k: keyof AdminJobPosting, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const field = "w-full h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"

  return (
    <div className="rounded-xl border border-[#c96c83]/30 bg-white p-5 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={field} placeholder="Title *" value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
        <select className={field} value={form.employment_type ?? "full_time"} onChange={(e) => set("employment_type", e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <input className={field} placeholder="Department" value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
        <input className={field} placeholder="Location" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
        <input className={field} placeholder="Salary min" value={form.salary_min ?? ""} onChange={(e) => set("salary_min", e.target.value)} />
        <input className={field} placeholder="Salary max" value={form.salary_max ?? ""} onChange={(e) => set("salary_max", e.target.value)} />
      </div>
      <textarea className={field.replace("h-10", "min-h-20 py-2")} placeholder="Description" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      <textarea className={field.replace("h-10", "min-h-20 py-2")} placeholder="Requirements" value={form.requirements ?? ""} onChange={(e) => set("requirements", e.target.value)} />
      <select className={field} value={form.status ?? "draft"} onChange={(e) => set("status", e.target.value)}>
        {["draft", "published", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <div className="flex gap-2">
        <Button size="sm" disabled={saving || !form.title} onClick={() => onSave(form)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function ApplicationsTab() {
  const [status, setStatus] = useState("")
  const { data, isLoading } = useAdminJobApplications({ status: status || undefined })
  const updateStatus = useUpdateApplicationStatus()
  const del = useDeleteApplication()
  const apps = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["", ...APP_STATUSES].map((s) => (
          <button key={s || "all"} onClick={() => setStatus(s)}
            className="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors"
            style={status === s ? { background: "#101217", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}>
            {s || "all"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-[#5f6268]">Loading…</p>
      ) : apps.length === 0 ? (
        <p className="rounded-xl border border-black/8 bg-white px-5 py-10 text-center text-sm text-[#5f6268]">No applications yet.</p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-xl border border-black/8 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#101217]">{a.name}</span>
                    {a.job_title && <span className="text-xs text-[#a36f4d]">{a.job_title}</span>}
                    <ScanBadge status={a.scan_status} />
                  </div>
                  <p className="text-xs text-[#5f6268] mt-0.5">{a.email}{a.phone ? ` · ${a.phone}` : ""} · {new Date(a.created_at).toLocaleDateString("en-CA")}</p>
                  {a.message && <p className="text-sm text-[#101217] mt-1.5">{a.message}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={a.status}
                    onChange={(e) => updateStatus.mutate({ id: a.id, status: e.target.value })}
                    className="h-8 border border-black/15 rounded-lg px-2 text-xs capitalize focus:outline-none focus:border-[#c96c83]"
                  >
                    {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    title="Delete application"
                    disabled={del.isPending}
                    onClick={() => { if (confirm("Delete this application?")) del.mutate(a.id) }}
                    className="text-[#d4754a] hover:opacity-70"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {a.documents.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.documents.map((d) => (
                    <button
                      key={d.id}
                      disabled={!d.downloadable}
                      onClick={() => downloadApplicationDocument(d.download_path, d.filename)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      title={d.downloadable ? "Download" : "Pending malware scan"}
                    >
                      {d.downloadable ? <Download className="size-3.5" /> : <Lock className="size-3.5" />}
                      {d.filename}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Badge({ label, kind }: { label: string; kind: string }) {
  const colors: Record<string, string> = { published: "#5a9e5a", draft: "#d4a843", closed: "#8a8d93" }
  const c = colors[kind] ?? "#8a8d93"
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: `${c}22`, color: c }}>{label}</span>
}

function ScanBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; t: string }> = {
    clean: { c: "#5a9e5a", t: "scanned" },
    pending: { c: "#d4a843", t: "scanning…" },
    infected: { c: "#d4754a", t: "infected — removed" },
  }
  const { c, t } = map[status] ?? map.pending
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${c}22`, color: c }}>{t}</span>
}
