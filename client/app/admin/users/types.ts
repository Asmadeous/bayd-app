// What /admin/users returns per account (the web Customers page's shape).
export interface AdminUser {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  marketing_opt_in: boolean
  created_at: string
}

export const ROLES = ["customer", "employee", "admin"] as const

export const userName = (u: AdminUser) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "-"
