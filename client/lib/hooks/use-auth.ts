"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import api from "@/lib/api"
import { API_BASE_URL } from "@/lib/config"
import { useAuthStore, type AuthUser } from "@/lib/stores/auth-store"

export function useAuth() {
  const router = useRouter()
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      api.post<{ token: string; user: AuthUser }>("/auth/login", creds).then((r) => r.data),
    onSuccess: ({ token, user }) => {
      setAuth(user, token)
      router.push(roleDashboard(user.role))
    },
  })

  const registerMutation = useMutation({
    mutationFn: ({ referral_code, ...data }: {
      email: string
      password: string
      first_name?: string
      last_name?: string
      phone?: string
      avatar_url?: string
      street_address?: string
      city?: string
      country?: string
      postal_code?: string
      special_needs?: boolean
      referral_code?: string
    }) =>
      api
        .post<{ token: string; user: AuthUser }>("/auth/register", { user: data, referral_code })
        .then((r) => r.data),
    onSuccess: ({ token, user }) => {
      setAuth(user, token)
      router.push(roleDashboard(user.role))
    },
  })

  // Google OAuth (authorization-code, backend-redirect). We just send the browser
  // to the API's /auth/google, which bounces through Google and 302s back to
  // /auth/callback?token=… (handled by app/auth/callback/page.tsx).
  function loginWithGoogle() {
    window.location.href = `${API_BASE_URL}/auth/google`
  }

  const updateMeMutation = useMutation({
    mutationFn: (data: {
      first_name?: string; last_name?: string; phone?: string; marketing_opt_in?: boolean; avatar_url?: string
      street_address?: string; city?: string; country?: string; postal_code?: string; special_needs?: boolean
    }) =>
      api.patch<AuthUser>("/auth/me", { user: data }).then((r) => r.data),
    onSuccess: (updatedUser) => {
      if (token) setAuth(updatedUser, token)
    },
  })

  function logout() {
    clearAuth()
    router.push("/signin")
  }

  return {
    user,
    token,
    isAuthenticated,
    logout,
    login: loginMutation,
    register: registerMutation,
    loginWithGoogle,
    updateMe: updateMeMutation,
  }
}

function roleDashboard(role: string) {
  if (role === "admin") return "/dashboard/admin"
  if (role === "employee") return "/dashboard/employee"
  return "/dashboard/customer"
}
