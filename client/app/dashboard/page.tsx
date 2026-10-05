"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function DashboardRootPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user) return
    if (user.role === "admin") router.replace("/dashboard/admin")
    else if (user.role === "employee") router.replace("/dashboard/employee")
    else router.replace("/dashboard/customer")
  }, [user, router])

  return null
}
