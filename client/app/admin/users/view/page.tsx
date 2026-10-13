"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { StatusBadge } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../../admin-theme"
import { apiError, fieldClass } from "../../ui"
import { ROLES, userName, type AdminUser } from "../types"

export default function AdminUserScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <UserDetail />
    </Suspense>
  )
}

// One account with the web Customers page's actions: change the role, message
// them (they reply in the app's chat), delete.
function UserDetail() {
  const id = Number(useSearchParams().get("id"))
  const router = useRouter()
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const { data: user, isLoading } = useQuery<AdminUser>({
    queryKey: ["admin-users", "one", id],
    queryFn: () => api.get<AdminUser>(`/admin/users/${id}`).then((r) => r.data),
    enabled: id > 0,
  })
  const [role, setRole] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  const saveRole = useMutation({
    mutationFn: (next: string) => api.patch(`/admin/users/${id}`, { role: next }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      setRole(null)
      toast({ title: "Role saved", variant: "success" })
    },
    onError: (e) => toast({ title: "Role update unsuccessful", description: apiError(e, "Could not update this user's role."), variant: "error" }),
  })
  const send = useMutation({
    mutationFn: async (text: string) => {
      const { data: convo } = await api.post<{ id: number }>("/conversations", { user_id: id })
      await api.post(`/conversations/${convo.id}/messages`, { body: text })
    },
    onSuccess: () => {
      setMessage("")
      toast({ title: "Message sent", description: "Replies appear under Messages.", variant: "success" })
    },
    onError: (e) => toast({ title: "Message not sent", description: apiError(e, "Please try again."), variant: "error" }),
  })
  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      toast({ title: "User deleted", variant: "success" })
      router.back()
    },
    onError: (e) => toast({ title: "User not deleted", description: apiError(e, "Could not delete this user."), variant: "error" }),
  })

  async function confirmDelete(u: AdminUser) {
    const ok = await confirm({
      title: "Delete user?",
      message: `This permanently removes ${u.email}. Related records may also be affected by account ownership rules.`,
      confirmLabel: "Delete user",
      tone: "danger",
    })
    if (ok) remove.mutate()
  }

  if (isLoading || !user) {
    return (
      <div className={adminScreenClass}>
        <AdminHeader back title="Account" />
        <p className={`px-5 text-sm ${mutedClass}`}>{isLoading ? "Loading…" : "Account not found."}</p>
      </div>
    )
  }

  const currentRole = role ?? user.role
  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="Account" />
      <div className="space-y-4 px-5">
        <section className={`${cardClass} p-5`}>
          <p className={`${displayClass} text-2xl`}>{userName(user)}</p>
          <StatusBadge className="mt-2 w-fit" tone={user.role === "admin" ? "dark" : user.role === "employee" ? "rose" : "gray"}>
            {user.role}
          </StatusBadge>
          <p className="mt-3 break-all text-base">{user.email}</p>
          {user.phone ? (
            <a href={`tel:${user.phone}`} className="mt-1 block text-base font-semibold text-[#C96C83]">
              {user.phone}
            </a>
          ) : null}
          <p className={`mt-1 text-sm ${mutedClass}`}>Joined {formatBookingDate(user.created_at, { month: "short", day: "numeric", year: "numeric" })}</p>
        </section>

        <section className={`${cardClass} space-y-2 p-5`}>
          <p className={eyebrowClass}>Role</p>
          <div className="flex gap-2">
            <select value={currentRole} onChange={(e) => setRole(e.target.value)} className={`${fieldClass} capitalize`} aria-label="Role">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={saveRole.isPending || currentRole === user.role}
              onClick={() => saveRole.mutate(currentRole)}
              className="h-11 shrink-0 rounded-xl bg-[#C96C83] px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              {saveRole.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        <section className={`${cardClass} space-y-2 p-5`}>
          <p className={eyebrowClass}>Message {user.first_name || user.email}</p>
          <p className={`text-sm ${mutedClass}`}>They see it in the app&apos;s Chat tab and can reply.</p>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi, this is the BAYD team…"
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-base outline-none focus:border-[#C96C83]"
          />
          <button
            type="button"
            disabled={!message.trim() || send.isPending}
            onClick={() => send.mutate(message.trim())}
            className="h-11 w-full rounded-xl bg-[#14100F] text-sm font-bold text-white disabled:opacity-40"
          >
            {send.isPending ? "Sending…" : "Send"}
          </button>
        </section>

        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => confirmDelete(user)}
          className="h-11 w-full rounded-xl border border-[#8f3f4b]/30 bg-white text-sm font-bold text-[#8f3f4b] disabled:opacity-40"
        >
          Delete user
        </button>
      </div>
    </div>
  )
}
