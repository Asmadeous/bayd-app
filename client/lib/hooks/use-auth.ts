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
    // Passwordless for customers (email + optional phone). Staff also pass a password.
    mutationFn: (creds: { email: string; phone?: string; password?: string }) =>
      api.post<{ token: string; user: AuthUser }>("/auth/login", creds).then((r) => r.data),
    onSuccess: ({ token, user }) => {
      setAuth(user, token)
      router.push(roleDashboard(user.role))
    },
  })

  const registerMutation = useMutation({
    mutationFn: ({ referral_code, ...data }: {
      email: string
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

  // Staff & admin: email + password on the dedicated staff endpoint.
  const staffLoginMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      api.post<{ token: string; user: AuthUser }>("/auth/staff_login", creds).then((r) => r.data),
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

  // Dashboard sign-in for an EXISTING account: request a one-click sign-in
  // link by email instead of trusting whatever email is typed. The backend
  // always responds success (no account-enumeration signal) — the link, once
  // clicked, redirects through /auth/callback?token=… same as Google OAuth.
  const requestMagicLinkMutation = useMutation({
    mutationFn: (email: string) =>
      api.post<{ message: string }>("/auth/magic_link", { email }).then((r) => r.data),
  })

  // Staff/admin password reset (customers are passwordless — nothing to
  // reset). Same shape as the magic link: always responds success.
  const requestPasswordResetMutation = useMutation({
    mutationFn: (email: string) =>
      api.post<{ message: string }>("/auth/password_reset", { email }).then((r) => r.data),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      api.post<{ message: string }>("/auth/password_reset/confirm", data).then((r) => r.data),
  })

  // Phone-number OTP login (customers). Step 1: text a code. Step 2: verify it
  // and receive a token, same as the other login paths.
  const requestPhoneCodeMutation = useMutation({
    mutationFn: (phone: string) =>
      api.post<{ status: string }>("/auth/phone_code", { phone }).then((r) => r.data),
  })

  const verifyPhoneCodeMutation = useMutation({
    mutationFn: (data: { phone: string; code: string }) =>
      api.post<{ token: string; user: AuthUser }>("/auth/phone_code/verify", data).then((r) => r.data),
    onSuccess: ({ token, user }) => {
      setAuth(user, token)
      router.push(roleDashboard(user.role))
    },
  })

  const updateMeMutation = useMutation({
    mutationFn: (data: {
      first_name?: string; last_name?: string; phone?: string; marketing_opt_in?: boolean; avatar_url?: string
      street_address?: string; city?: string; country?: string; postal_code?: string; special_needs?: boolean
      avatar?: File | null
    }) => {
      const { avatar, ...fields } = data
      if (!avatar) return api.patch<AuthUser>("/auth/me", { user: fields }).then((r) => r.data)

      const payload = new FormData()
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) payload.append(`user[${key}]`, String(value))
      })
      payload.append("avatar", avatar)
      return api
        .patch<AuthUser>("/auth/me", payload, { headers: { "Content-Type": "multipart/form-data" } })
        .then((r) => r.data)
    },
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
    staffLogin: staffLoginMutation,
    loginWithGoogle,
    requestMagicLink: requestMagicLinkMutation,
    requestPasswordReset: requestPasswordResetMutation,
    resetPassword: resetPasswordMutation,
    requestPhoneCode: requestPhoneCodeMutation,
    verifyPhoneCode: verifyPhoneCodeMutation,
    updateMe: updateMeMutation,
  }
}

function roleDashboard(role: string) {
  if (role === "admin") return "/dashboard/admin"
  if (role === "employee") return "/dashboard/employee"
  return "/dashboard/customer"
}
