"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type Role = "customer" | "employee" | "admin"

export interface AuthUser {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: Role
  marketing_opt_in: boolean
  avatar_url: string | null
  created_at: string
  street_address: string | null
  city: string | null
  country: string | null
  postal_code: string | null
  special_needs: boolean
}

interface AuthStore {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "bayd-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
