"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search, Users } from "lucide-react"

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/dashboard/data-table"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { DashboardToolbar, ToolbarSection } from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { adminUsersSteps } from "@/lib/tours/admin-users-tour"
import { useToast } from "@/components/bayd-toast-provider"

interface User {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  marketing_opt_in: boolean
  created_at: string
}

interface PagedResponse<T> {
  data: T[]
  pagination: {
    current_page: number
    total_pages: number
    next_page: number | null
    total_count: number
  }
}

const ROLES = ["customer", "employee", "admin"]

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  // Defaults to customers only — Employees have their own dedicated tab.
  // Switch the dropdown to "All roles" (or "employee"/"admin") to see others.
  const [roleFilter, setRoleFilter] = useState("customer")
  const [q, setQ] = useState("")
  const [editId, setEditId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState("")
  const [updateError, setUpdateError] = useState<string | null>(null)

  const { data, isLoading } = useQuery<PagedResponse<User>>({
    queryKey: ["admin-users", page, roleFilter, q],
    queryFn: () =>
      api
        .get<PagedResponse<User>>("/admin/users", {
          params: { page, role: roleFilter || undefined, q: q || undefined },
        })
        .then((response) => response.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.patch(`/admin/users/${id}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      setEditId(null)
      setUpdateError(null)
    },
    onError: (error: unknown) => {
      const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
      const message = data?.error ?? data?.errors?.join(", ") ?? "Could not update this user's role."
      setUpdateError(message)
      toast({ title: "Role update unsuccessful", description: message, variant: "error" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  })

  const users = data?.data ?? []
  const pagination = data?.pagination

  function updateSearch(value: string) {
    setQ(value)
    setPage(1)
  }

  function updateRoleFilter(value: string) {
    setRoleFilter(value)
    setPage(1)
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-users-header">
        <DashboardHeader
          title="Customers"
          subtitle={
            roleFilter
              ? `${pagination?.total_count ?? "-"} registered ${roleFilter}s.`
              : `${pagination?.total_count ?? "-"} registered users across customer, employee, and admin roles.`
          }
        />
      </div>

      <DashboardToolbar data-tour="admin-users-filters">
        <ToolbarSection>
          <label className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8d93]"
            />
            <input
              className="h-10 w-64 border border-black/15 bg-white pl-9 pr-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search by email"
              value={q}
            />
          </label>
          <Select
            onValueChange={(value) => updateRoleFilter(value ?? "")}
            value={roleFilter}
          >
            <SelectTrigger className="w-40 capitalize">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              {ROLES.map((role) => (
                <SelectItem className="capitalize" key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ToolbarSection>
        <ToolbarSection className="text-sm font-semibold text-[#5f6268]">
          Page {page}
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading users...</p>
        </DashboardPanel>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Adjust the search or role filter to find another account."
        />
      ) : (
        <div data-tour="admin-users-list">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Email</DataTableHeaderCell>
                <DataTableHeaderCell>Role</DataTableHeaderCell>
                <DataTableHeaderCell>Joined</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {users.map((user) => (
                <DataTableRow key={user.id}>
                  <DataTableCell className="font-bold text-[#101217]">
                    {[user.first_name, user.last_name].filter(Boolean).join(" ") || "-"}
                  </DataTableCell>
                  <DataTableCell>{user.email}</DataTableCell>
                  <DataTableCell>
                    {editId === user.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          onValueChange={(value) => setEditRole(value ?? "")}
                          value={editRole}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs capitalize">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem className="capitalize" key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          disabled={updateMutation.isPending}
                          onClick={() => {
                            setUpdateError(null)
                            updateMutation.mutate({ id: user.id, role: editRole })
                          }}
                          size="xs"
                          style={{ background: "#c96c83", border: "none", color: "#fff" }}
                        >
                          {updateMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          onClick={() => {
                            setEditId(null)
                            setUpdateError(null)
                          }}
                          size="xs"
                          variant="ghost"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <RoleBadge role={user.role} />
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-xs">
                    {new Date(user.created_at).toLocaleDateString("en-CA")}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => {
                          setEditId(user.id)
                          setEditRole(user.role)
                        }}
                        size="xs"
                        variant="outline"
                      >
                        Edit Role
                      </Button>
                      <Button
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm("Delete this user?")) deleteMutation.mutate(user.id)
                        }}
                        size="xs"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      {updateError ? (
        <div
          aria-live="polite"
          className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {updateError}
        </div>
      ) : null}

      {pagination && pagination.total_pages > 1 ? (
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
              {page} / {pagination.total_pages}
            </span>
            <Button
              disabled={!pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <TutorialButton steps={adminUsersSteps} pageKey="admin-users" />
    </DashboardPage>
  )
}

function RoleBadge({ role }: { role: string }) {
  const tone = role === "admin" ? "dark" : role === "employee" ? "rose" : "gray"

  return <StatusBadge tone={tone}>{role}</StatusBadge>
}
