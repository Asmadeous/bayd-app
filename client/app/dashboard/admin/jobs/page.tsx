"use client"

import { useState } from "react"
import { BriefcaseBusiness, Download, Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAdminJobPostings,
  useSaveJobPosting,
  useDeleteJobPosting,
  useAdminJobApplications,
  useUpdateApplicationStatus,
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
    <DashboardPage maxWidth="wide">
      <DashboardHeader title="Jobs" subtitle="Manage job postings and applications" />
      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
        {(["postings", "applications"] as const).map((t) => (
          <SegmentButton
            active={tab === t}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </SegmentButton>
        ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>
      {tab === "postings" ? <PostingsTab /> : <ApplicationsTab />}
    </DashboardPage>
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
      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
          {["", "draft", "published", "closed"].map((s) => (
            <SegmentButton
              active={status === s}
              key={s || "all"}
              onClick={() => setStatus(s)}
            >
              {s || "all"}
            </SegmentButton>
          ))}
          </SegmentedControl>
        </ToolbarSection>
        <ToolbarSection>
        <Button size="sm" onClick={() => setEditing({ employment_type: "full_time", status: "draft" })} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          <Plus className="size-4" /> New posting
        </Button>
        </ToolbarSection>
      </DashboardToolbar>

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
        <EmptyState
          icon={BriefcaseBusiness}
          title="No postings yet"
          description="Create a job posting to start collecting applications."
        />
      ) : (
        <div className="space-y-3">
          {postings.map((p) => (
            <DashboardPanel key={p.id} className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-[#101217]">{p.title}</span>
                  <StatusBadgeFor status={p.status} />
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
            </DashboardPanel>
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
    <DashboardPanel className="space-y-3 border-[#c96c83]/30">
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={field} placeholder="Title *" value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
        <Select
          onValueChange={(value) => set("employment_type", value ?? "full_time")}
          value={form.employment_type ?? "full_time"}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {TYPE_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input className={field} placeholder="Department" value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
        <input className={field} placeholder="Location" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
        <input className={field} placeholder="Salary min" value={form.salary_min ?? ""} onChange={(e) => set("salary_min", e.target.value)} />
        <input className={field} placeholder="Salary max" value={form.salary_max ?? ""} onChange={(e) => set("salary_max", e.target.value)} />
      </div>
      <textarea className={field.replace("h-10", "min-h-20 py-2")} placeholder="Description" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      <textarea className={field.replace("h-10", "min-h-20 py-2")} placeholder="Requirements" value={form.requirements ?? ""} onChange={(e) => set("requirements", e.target.value)} />
      <Select
        onValueChange={(value) => set("status", value ?? "draft")}
        value={form.status ?? "draft"}
      >
        <SelectTrigger className="capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {["draft", "published", "closed"].map((status) => (
            <SelectItem className="capitalize" key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button size="sm" disabled={saving || !form.title} onClick={() => onSave(form)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </DashboardPanel>
  )
}

function ApplicationsTab() {
  const [status, setStatus] = useState("")
  const { data, isLoading } = useAdminJobApplications({ status: status || undefined })
  const updateStatus = useUpdateApplicationStatus()
  const apps = data?.data ?? []

  return (
    <div className="space-y-4">
      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
        {["", ...APP_STATUSES].map((s) => (
          <SegmentButton active={status === s} key={s || "all"} onClick={() => setStatus(s)}>
            {s || "all"}
          </SegmentButton>
        ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <p className="text-sm text-[#5f6268]">Loading…</p>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No applications yet"
          description="Applications matching this filter will appear here."
        />
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <DashboardPanel key={a.id}>
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
                <Select
                  onValueChange={(value) =>
                    updateStatus.mutate({ id: a.id, status: value ?? a.status })
                  }
                  value={a.status}
                >
                  <SelectTrigger className="h-8 w-32 text-xs capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_STATUSES.map((status) => (
                      <SelectItem className="capitalize" key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </DashboardPanel>
          ))}
        </div>
      )}
    </div>
  )
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
