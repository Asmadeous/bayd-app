"use client"

import { useState, type ReactNode } from "react"
import { z } from "zod"

import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSaveJobPosting, type AdminJobPosting } from "@/lib/hooks/use-admin"

// The job posting editor, shared by the web Jobs page and the BAYD Admin app.

const TYPES = ["full_time", "part_time", "contract", "temporary", "internship"]
const TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", temporary: "Temporary", internship: "Internship",
}

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

// Creates or edits a posting: title, type, department, location, salary range,
// status, description and requirements. `initial` is the posting being edited,
// or the defaults for a new one.
export function JobPostingEditor({ initial, onClose }: { initial: Blank; onClose: () => void }) {
  const { toast } = useToast()
  const save = useSaveJobPosting()
  const [editing, setEditing] = useState<Blank>(initial)
  const [formErrors, setFormErrors] = useState<JobFormErrors>({})

  function updateForm<K extends keyof Blank>(key: K, value: Blank[K]) {
    setEditing((current) => ({ ...current, [key]: value }))
    setFormErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function savePosting() {
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
        onClose()
      },
      onError: (error: unknown) => {
        const message = getApiErrorMessage(error, editing.id ? "Could not update this posting." : "Could not create this posting.")
        setFormErrors({ base: message })
        toast({ title: editing.id ? "Posting not saved" : "Posting not created", description: message, variant: "error" })
      },
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
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
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ScanBadge({ status }: { status: string }) {
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
