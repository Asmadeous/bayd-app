"use client"

import { useState } from "react"
import type { MouseEvent } from "react"
import Link from "next/link"
import { ArrowRight, Bell, Check, MailOpen } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { DashboardToolbar, ToolbarSection } from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/lib/hooks/use-notifications"

export default function CustomerNotificationsPage() {
  const [page, setPage] = useState(1)
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null)
  const { data, isLoading } = useNotifications(page)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []
  const unread = data?.unread_count ?? 0

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        actions={
          unread > 0 ? (
            <Button
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
              size="sm"
              variant="outline"
            >
              Mark all read
            </Button>
          ) : null
        }
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You are all caught up."}
      />

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading notifications...</p>
        </DashboardPanel>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Booking updates, receipts, and account notices will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onOpen={() => {
                setSelectedNotification(notification)
                if (!notification.read_at) {
                  markRead.mutate(notification.id)
                }
              }}
              onRead={(event) => {
                event.stopPropagation()
                markRead.mutate(notification.id)
              }}
            />
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              size="sm"
              variant="outline"
            >
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {page} / {data.pagination.total_pages}
            </span>
            <Button
              disabled={!data.pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <NotificationDetailsSheet
        notification={selectedNotification}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNotification(null)
          }
        }}
      />
    </DashboardPage>
  )
}

function NotificationRow({
  notification,
  onOpen,
  onRead,
}: {
  notification: AppNotification
  onOpen: () => void
  onRead: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  const isUnread = !notification.read_at

  return (
    <DashboardPanel className="group p-0 transition-colors hover:border-[#c96c83]/30">
      <div
        className="flex items-start gap-4 border-l-4 p-5"
        style={{ borderLeftColor: isUnread ? "#c96c83" : "transparent" }}
      >
        <span
          className="mt-1.5 flex size-9 shrink-0 items-center justify-center border border-black/8 bg-[#fbfaf7] text-[#c96c83]"
          aria-hidden="true"
        >
          {isUnread ? <Bell className="size-4" /> : <MailOpen className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <button className="block w-full text-left" onClick={onOpen} type="button">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-extrabold text-[#101217]">
                    {notification.title}
                  </p>
                  {isUnread ? (
                    <span className="bg-[#c96c83]/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#b95f76]">
                      New
                    </span>
                  ) : null}
                </div>
                {notification.body ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f6268]">
                    {notification.body}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#5f6268]">
                {formatNotificationDate(notification.created_at)}
              </span>
            </div>
          </button>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#c96c83]"
              onClick={onOpen}
              type="button"
            >
              View details
              <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
            {isUnread ? (
              <button
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f6268] hover:text-[#101217]"
                onClick={onRead}
                type="button"
              >
                <Check aria-hidden="true" className="size-3.5" />
                Mark read
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardPanel>
  )
}

function NotificationDetailsSheet({
  notification,
  onOpenChange,
}: {
  notification: AppNotification | null
  onOpenChange: (open: boolean) => void
}) {
  const cta = notification ? (notification.metadata?.cta as string) || "View" : "View"
  const actionPath = notification?.action_url?.replace(/^https?:\/\/[^/]+/, "")
  const metadataEntries = Object.entries(notification?.metadata ?? {}).filter(
    ([key]) => key !== "cta"
  )

  return (
    <Sheet open={Boolean(notification)} onOpenChange={onOpenChange} swipeDirection="right">
      <SheetContent>
        <SheetHeader>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
            Notification
          </p>
          <SheetTitle className="text-xl font-extrabold leading-tight text-[#101217]">
            {notification?.title ?? "Notification"}
          </SheetTitle>
          <SheetDescription className="text-sm leading-6 text-[#5f6268]">
            {notification ? formatNotificationDateTime(notification.created_at) : ""}
          </SheetDescription>
        </SheetHeader>

        {notification ? (
          <SheetBody className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className="border border-black/8 bg-[#fbfaf7] px-2.5 py-1 text-xs font-bold capitalize text-[#5f6268]">
                {notification.kind.replaceAll("_", " ")}
              </span>
              <span className="border border-black/8 bg-[#fbfaf7] px-2.5 py-1 text-xs font-bold text-[#5f6268]">
                {notification.read_at ? "Read" : "Unread"}
              </span>
            </div>

            <div className="border border-black/8 bg-[#fbfaf7] px-4 py-4">
              <p className="text-sm leading-7 text-[#4b4f56]">
                {notification.body || "No extra details were included with this notification."}
              </p>
            </div>

            {actionPath ? (
              <Link href={actionPath}>
                <Button className="h-10 w-full bg-[#101217] text-white hover:bg-[#101217]/90">
                  {cta}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </Link>
            ) : null}

            {metadataEntries.length > 0 ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                  Details
                </p>
                <dl className="mt-3 divide-y divide-black/8 border border-black/8">
                  {metadataEntries.map(([key, value]) => (
                    <div className="grid gap-1 bg-white px-3 py-3 sm:grid-cols-[120px_1fr]" key={key}>
                      <dt className="text-xs font-bold capitalize text-[#5f6268]">
                        {key.replaceAll("_", " ")}
                      </dt>
                      <dd className="break-words text-sm font-semibold text-[#101217]">
                        {formatMetadataValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </SheetBody>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function formatNotificationDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  })
}

function formatNotificationDateTime(value: string) {
  return new Date(value).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) {
    return "-"
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return JSON.stringify(value)
}
