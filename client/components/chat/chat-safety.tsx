"use client"

import { useState } from "react"
import { Ban, EllipsisVertical, Flag, X } from "lucide-react"

import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { useReportConversation, useSetBlocked } from "@/lib/hooks/use-conversations"
import { cn } from "@/lib/utils"

// Must match ChatReport::REASONS on the server.
const REPORT_REASONS = ["Harassment or abuse", "Inappropriate or sexual content", "Spam or scam", "Something else"]

function apiError(e: unknown) {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Please try again."
}

// The thread header's "..." menu: report or block the other person (Apple
// guideline 1.2). Shared by the customer and staff chat screens.
export function ChatSafetyMenu({
  conversationId,
  name,
  blockedByMe,
}: {
  conversationId: number
  name: string
  blockedByMe: boolean
}) {
  const [open, setOpen] = useState<"menu" | "report" | null>(null)
  const confirm = useConfirm()
  const { toast } = useToast()
  const setBlocked = useSetBlocked(conversationId)

  async function toggleBlock() {
    setOpen(null)
    if (!blockedByMe) {
      const ok = await confirm({
        title: `Block ${name}?`,
        message: `Neither of you will be able to send messages in this chat. ${name} isn't told. You can unblock any time.`,
        confirmLabel: "Block",
        cancelLabel: "Cancel",
        tone: "danger",
      })
      if (!ok) return
    }
    try {
      await setBlocked.mutateAsync(!blockedByMe)
      toast({ title: blockedByMe ? `${name} unblocked` : `${name} blocked`, variant: "success" })
    } catch (e) {
      toast({ title: "Couldn't update", description: apiError(e), variant: "error" })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen("menu")}
        aria-label="Chat options"
        className="ml-auto grid size-10 shrink-0 place-items-center rounded-full text-[#101217]/60"
      >
        <EllipsisVertical className="size-5" aria-hidden />
      </button>

      {open === "menu" && (
        <BottomSheet title={name} onClose={() => setOpen(null)}>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setOpen("report")}
              className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left font-semibold text-[#101217]"
            >
              <Flag className="size-5 text-[#8f3f4b]" aria-hidden /> Report {name}
            </button>
            <button
              type="button"
              onClick={toggleBlock}
              className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left font-semibold text-[#8f3f4b]"
            >
              <Ban className="size-5" aria-hidden /> {blockedByMe ? `Unblock ${name}` : `Block ${name}`}
            </button>
          </div>
        </BottomSheet>
      )}

      {open === "report" && (
        <ReportSheet conversationId={conversationId} name={name} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

function ReportSheet({ conversationId, name, onClose }: { conversationId: number; name: string; onClose: () => void }) {
  const { toast } = useToast()
  const report = useReportConversation(conversationId)
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")

  async function submit() {
    try {
      await report.mutateAsync({ reason, details: details.trim() || undefined })
      toast({ title: "Report sent", description: "Our team will review it. You can also block this person.", variant: "success" })
      onClose()
    } catch (e) {
      toast({ title: "Couldn't send the report", description: apiError(e), variant: "error" })
    }
  }

  return (
    <BottomSheet title={`Report ${name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-[#101217]/65">Our team is told and reviews the conversation. {name} isn&apos;t told about your report.</p>
      <div className="grid gap-2">
        {REPORT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            aria-pressed={reason === r}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-sm font-bold",
              reason === r ? "border-[#101217] bg-[#101217] text-white" : "border-black/10 bg-white text-[#101217]",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        placeholder="Anything else we should know? (optional)"
        className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base text-[#101217] outline-none placeholder:text-[#101217]/35 focus:border-[#c96c83]"
      />
      <button
        type="button"
        disabled={!reason || report.isPending}
        onClick={submit}
        className="mt-3 w-full rounded-2xl bg-[#8f3f4b] py-3.5 text-base font-bold text-white disabled:opacity-50"
      >
        {report.isPending ? "Sending…" : "Send report"}
      </button>
    </BottomSheet>
  )
}

// Replaces the composer while either person has blocked the other.
export function ChatBlockedNotice({ name, blockedByMe }: { name: string; blockedByMe: boolean }) {
  return (
    <div className="border-t border-black/5 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-sm text-[#101217]/65">
      {blockedByMe ? `You blocked ${name}. Unblock them from the menu to message again.` : `You can't message ${name}.`}
    </div>
  )
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-[#F6F1EC] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-[#101217]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-[#101217]/50">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
