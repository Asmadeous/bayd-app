"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
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
import api from "@/lib/api"

interface Campaign {
  id: number
  subject: string
  body: string
  sent_at: string | null
  recipients_count: number
  sent_by: string | null
}

interface CampaignsResponse {
  data: Campaign[]
  subscriber_count: number
  mailing_address: string
}

function apiError(e: unknown) {
  const data = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? "Please try again."
}

// Write a newsletter, send yourself a test, then send it to every subscriber.
// Blog posts still email subscribers automatically when published.
export function NewsletterComposer() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const { data } = useQuery({
    queryKey: ["admin-newsletter-campaigns"],
    queryFn: () => api.get<CampaignsResponse>("/admin/newsletter_campaigns").then((r) => r.data),
  })
  const payload = { newsletter_campaign: { subject, body } }

  const preview = useMutation({
    mutationFn: () => api.post<{ sent_to: string }>("/admin/newsletter_campaigns/preview", payload).then((r) => r.data),
    onSuccess: (res) => toast({ title: "Test sent", description: `Check ${res.sent_to}.`, variant: "success" }),
    onError: (e) => toast({ title: "Test not sent", description: apiError(e), variant: "error" }),
  })

  const send = useMutation({
    mutationFn: () => api.post<Campaign>("/admin/newsletter_campaigns", payload).then((r) => r.data),
    onSuccess: (campaign) => {
      qc.invalidateQueries({ queryKey: ["admin-newsletter-campaigns"] })
      setSubject("")
      setBody("")
      toast({ title: "Newsletter sending", description: `Going out to ${campaign.recipients_count} subscribers.`, variant: "success" })
    },
    onError: (e) => toast({ title: "Newsletter not sent", description: apiError(e), variant: "error" }),
  })

  const count = data?.subscriber_count ?? 0
  const ready = subject.trim() !== "" && body.trim() !== ""
  const missingAddress = data && !data.mailing_address

  return (
    <div className="space-y-4">
      <DashboardPanel className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#101217]">Write a newsletter</h2>
          <p className="text-sm text-[#5f6268]">
            Goes to {count} current subscriber{count === 1 ? "" : "s"}. New blog posts are emailed automatically when you
            publish them.
          </p>
        </div>

        {missingAddress ? (
          <p className="border border-[#b75c68]/25 bg-[#fff5f6] px-3 py-2 text-sm font-semibold text-[#8f3f4b]">
            Add your business mailing address under{" "}
            <Link href="/dashboard/admin/settings" className="underline">
              Payments settings
            </Link>{" "}
            before sending. Canada&apos;s anti-spam law (CASL) requires it in every newsletter.
          </p>
        ) : null}

        <input
          aria-label="Subject"
          value={subject}
          maxLength={150}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="h-10 w-full border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#c96c83]"
        />
        <textarea
          aria-label="Message"
          value={body}
          rows={8}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message. Leave a blank line between paragraphs."
          className="w-full border border-black/15 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#c96c83]"
        />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!ready || preview.isPending} onClick={() => preview.mutate()}>
            {preview.isPending ? "Sending test..." : "Send me a test"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={!ready || count === 0 || send.isPending || !!missingAddress}>
                Send to {count} subscriber{count === 1 ? "" : "s"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send &ldquo;{subject}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  It goes to {count} subscriber{count === 1 ? "" : "s"} now and can&apos;t be unsent. Send yourself a test first
                  if you haven&apos;t.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => send.mutate()}>Send newsletter</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardPanel>

      {data?.data.length ? (
        <DashboardPanel>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-[0.14em] text-[#6b6f76]">Sent newsletters</h2>
          <ul className="divide-y divide-black/8">
            {data.data.map((c) => (
              <li key={c.id} className="py-2.5">
                <p className="text-sm font-bold text-[#101217]">{c.subject}</p>
                <p className="text-xs text-[#5f6268]">
                  {c.sent_at ? new Date(c.sent_at).toLocaleString("en-CA") : "Not sent"} · {c.recipients_count} recipients
                  {c.sent_by ? ` · by ${c.sent_by}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </DashboardPanel>
      ) : null}
    </div>
  )
}
