"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"

// Admins and super admins only; anyone else goes back to their own dashboard.
// The API refuses them either way, this keeps the admin shell out of sight.
export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAuthStore()
  const isAdmin = user?.role === "admin" || user?.role === "super_admin"

  useEffect(() => {
    if (user && !isAdmin) router.replace("/dashboard")
  }, [user, isAdmin, router])

  return isAdmin ? <>{children}</> : null
}
