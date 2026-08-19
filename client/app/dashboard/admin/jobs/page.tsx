"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { BriefcaseBusiness, Download, Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { z } from "zod"

import { useToast } from "@/components/bayd-toast-provider"
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
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { adminJobsSteps } from "@/lib/tours/admin-jobs-tour"

const TYPES = ["full_time", "part_time", "contract", "temporary", "internship"]
const TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", temporary: "Temporary", internship: "Internship",
}
const APP_STATUSES = ["unread", "reviewing", "rejected", "hired"]

type Blank = Partial<AdminJobPosting>
type JobFormErrors = Partial<Record<keyof Blank | "base", string>>

const STATUS_OPTIONS: AdminJobPosting["status"][] = ["draft", "published", "closed"]

const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), `${label} must be a number.`)
    .refine((value) => !value || Number(value) >= 0, `${label} cannot be negative.`)

const jobPostingSchema = z
  .object({
    id: z.number().optional(),
    title: z.string().trim().min(1, "Title is required."),
    department: z.string().trim().optional(),
    location: z.string().trim().optional(),
    employment_type: z.enum(["full_time", "part_time", "contract", "temporary", "internship"]),
    description: z.string().trim().optional(),
    requirements: z.string().trim().optional(),
    salary_min: optionalMoney("Salary min"),
    salary_max: optionalMoney("Salary max"),
    status: z.enum(["draft", "published", "closed"]),
  })
  .refine(
    (value) =>
      !value.salary_min ||
      !value.salary_max ||
      !Number.isFinite(Number(value.salary_min)) ||
      !Number.isFinite(Number(value.salary_max)) ||
      Number(value.salary_max) >= Number(value.salary_min),
    { message: "Salary max must be greater than or equal to salary min.", path: ["salary_max"] }
  )

export default function AdminJobsPage() {
  const [tab, setTab] = useState<"postings" | "applications">("postings")

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-jobs-header">
        <DashboardHeader title="Jobs" subtitle="Manage job postings and applications" />
      </div>
      <DashboardToolbar data-tour="admin-jobs-tabs">
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
      <div data-tour="admin-jobs-content">
        {tab === "postings" ? <PostingsTab /> : <ApplicationsTab />}
      </div>

      <TutorialButton steps={adminJobsSteps} pageKey="admin-jobs" />
    </DashboardPage>
  )
}

function PostingsTab() {
  const { toast } = useToast()
  const [status, setStatus] = useState("")
  const { data, isLoading } = useAdminJobPostings({ status: status || undefined })
  const save = useSaveJobPosting()
  const del = useDeleteJobPosting()
  const [editing, setEditing] = useState<Blank | null>(null)
  const [formErrors, setFormErrors] = useState<JobFormErrors>({})

  const postings = data?.data ?? []

  function openCreate() {
    setEditing({ employment_type: "full_time", status: "draft" })
    setFormErrors({})
  }

  function openEdit(posting: AdminJobPosting) {
    setEditing(posting)
    setFormErrors({})
  }

  function closeEditor() {
    setEditing(null)
    setFormErrors({})
  }

  function updateForm<K extends keyof Blank>(key: K, value: Blank[K]) {
    setEditing((current) => ({ ...current!, [key]: value }))
    setFormErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function savePosting() {
    if (!editing) return
    const result = jobPostingSchema.safeParse(editing)
    if (!result.success) {
      const nextErrors = getJobFieldErrors(result.error)
      setFormErrors(nextErrors)
      toast({ title: "Posting form needs attention", description: nextErrors.base, variant: "error" })
      return
    }

    const payload = normalizeJobPosting(editing)
    save.mutate(payload, {
      onSuccess: () => {
        toast({ title: editing.id ? "Posting saved" : "Posting created", variant: "success" })
        closeEditor()
      },
      onError: (error: unknown) => {
        const message = getApiErrorMessage(error, editing.id ? "Could not update this posting." : "Could not create this posting.")
        setFormErrors({ base: message })
        toast({ title: editing.id ? "Posting not saved" : "Posting not created", description: message, variant: "error" })
      },
    })
  }

  function deletePosting(posting: AdminJobPosting) {
    del.mutate(posting.id, {
      onSuccess: () => {
        toast({ title: "Posting deleted", description: `${posting.title} was removed.`, variant: "success" })
      },
      onError: (error: unknown) => {
        toast({
          title: "Posting not deleted",
          description: getApiErrorMessage(error, "Could not delete this job posting."),
          variant: "error",
        })
      },
    })
  }

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
        <Button size="sm" onClick={openCreate} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          <Plus className="size-4" /> New posting
        </Button>
        </ToolbarSection>
      </DashboardToolbar>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) closeEditor() }}>
        <DialogContent data-tour="admin-jobs-editor" className="max-w-5xl">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Job posting
            </p>
            <DialogTitle>{editing?.id ? "Edit Posting" : "New Posting"}</DialogTitle>
            <DialogDescription>
              Manage the public job listing details, compensation range, and publishing status.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {formErrors.base ? (
              <div
                aria-live="polite"
                className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
              >
                {formErrors.base}
              </div>
            ) : null}
            {editing ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field error={formErrors.title} label="Title">
                    <input
                      aria-invalid={Boolean(formErrors.title)}
                      className={fieldClass(formErrors.title)}
                      onChange={(event) => updateForm("title", event.target.value)}
                      value={editing.title ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.employment_type} label="Employment type">
                    <Select
                      onValueChange={(value) => updateForm("employment_type", value ?? "full_time")}
                      value={editing.employment_type ?? "full_time"}
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
                  </Field>
                  <Field error={formErrors.department} label="Department">
                    <input
                      aria-invalid={Boolean(formErrors.department)}
                      className={fieldClass(formErrors.department)}
                      onChange={(event) => updateForm("department", event.target.value)}
                      value={editing.department ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.location} label="Location">
                    <input
                      aria-invalid={Boolean(formErrors.location)}
                      className={fieldClass(formErrors.location)}
                      onChange={(event) => updateForm("location", event.target.value)}
                      value={editing.location ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.salary_min} label="Salary min">
                    <input
                      aria-invalid={Boolean(formErrors.salary_min)}
                      className={fieldClass(formErrors.salary_min)}
                      min="0"
                      onChange={(event) => updateForm("salary_min", event.target.value)}
                      type="number"
                      value={editing.salary_min ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.salary_max} label="Salary max">
                    <input
                      aria-invalid={Boolean(formErrors.salary_max)}
                      className={fieldClass(formErrors.salary_max)}
                      min="0"
                      onChange={(event) => updateForm("salary_max", event.target.value)}
                      type="number"
                      value={editing.salary_max ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.status} label="Status">
                    <Select
                      onValueChange={(value) => updateForm("status", value as AdminJobPosting["status"])}
                      value={editing.status ?? "draft"}
                    >
                      <SelectTrigger className="capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem className="capitalize" key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field error={formErrors.description} label="Description">
                    <textarea
                      aria-invalid={Boolean(formErrors.description)}
                      className={fieldClass(formErrors.description, "min-h-28 py-2")}
                      onChange={(event) => updateForm("description", event.target.value)}
                      value={editing.description ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.requirements} label="Requirements">
                    <textarea
                      aria-invalid={Boolean(formErrors.requirements)}
                      className={fieldClass(formErrors.requirements, "min-h-28 py-2")}
                      onChange={(event) => updateForm("requirements", event.target.value)}
                      value={editing.requirements ?? ""}
                    />
                  </Field>
                </div>
              </>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button size="sm" disabled={save.isPending} onClick={savePosting} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={closeEditor}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Button size="xs" variant="outline" onClick={() => openEdit(p)}><Pencil className="size-3.5" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="xs" variant="outline" disabled={del.isPending}>
                      <Trash2 className="size-3.5 text-[#d4754a]" />
                      <span className="sr-only">Delete {p.title}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete job posting?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes &quot;{p.title}&quot; from the job board. Existing applications remain in the system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deletePosting(p)}>
                        Delete posting
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}
    </div>
  )
}

function ApplicationsTab() {
  const { toast } = useToast()
  const [status, setStatus] = useState("")
  const { data, isLoading } = useAdminJobApplications({ status: status || undefined })
  const updateStatus = useUpdateApplicationStatus()
  const apps = data?.data ?? []

  function updateApplicationStatus(id: number, nextStatus: string) {
    updateStatus.mutate(
      { id, status: nextStatus },
      {
        onSuccess: () => toast({ title: "Application status updated", variant: "success" }),
        onError: (error: unknown) => {
          toast({
            title: "Application status not updated",
            description: getApiErrorMessage(error, "Could not update this application."),
            variant: "error",
          })
        },
      }
    )
  }

  async function downloadDocument(downloadPath: string, filename: string) {
    try {
      await downloadApplicationDocument(downloadPath, filename)
    } catch (error) {
      toast({
        title: "Document not downloaded",
        description: getApiErrorMessage(error, "This document is not available for download yet."),
        variant: "error",
      })
    }
  }

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
                  disabled={updateStatus.isPending}
                  onValueChange={(value) => updateApplicationStatus(a.id, value ?? a.status)}
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
                      onClick={() => downloadDocument(d.download_path, d.filename)}
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

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"

function Field({ children, error, label }: { children: ReactNode; error?: string; label: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}

function fieldClass(error?: string, overrideSize?: string) {
  const size = overrideSize ?? "h-10"
  return `${inputClass.replace("h-10", size)} ${error ? errorInputClass : ""}`
}

function normalizeJobPosting(input: Blank): Blank & { id?: number } {
  return {
    id: input.id,
    title: input.title?.trim(),
    department: input.department?.trim() || "",
    location: input.location?.trim() || "",
    employment_type: input.employment_type ?? "full_time",
    description: input.description?.trim() || "",
    requirements: input.requirements?.trim() || "",
    salary_min: input.salary_min?.toString().trim() || "",
    salary_max: input.salary_max?.toString().trim() || "",
    status: input.status ?? "draft",
  }
}

function getJobFieldErrors(error: z.ZodError<Blank>): JobFormErrors {
  const next: JobFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !next[key as keyof JobFormErrors]) {
      next[key as keyof JobFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
