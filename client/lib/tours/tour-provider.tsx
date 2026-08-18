"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { StepType } from "@reactour/tour"

import { useAuthStore, type Role } from "@/lib/stores/auth-store"

// ─── Tour-completion persistence ────────────────────────────────────

const STORAGE_KEY = "bayd-tour-completed"

function getTourCompleted(role: Role, page: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const map = JSON.parse(raw) as Record<string, boolean>
    return !!map[`${role}:${page}`]
  } catch {
    return false
  }
}

function setTourCompleted(role: Role, page: string) {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    map[`${role}:${page}`] = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage failures
  }
}

function resetAllTours() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

// ─── Context ────────────────────────────────────────────────────────

interface TourContextValue {
  /** Open a specific tour by providing its steps and page key */
  startTour: (steps: StepType[], pageKey: string) => void
  /** Whether a tour is currently active */
  isOpen: boolean
  /** Close the active tour */
  closeTour: () => void
  /** The steps of the active tour */
  activeSteps: StepType[]
  /** Current step index */
  currentStep: number
  /** Set the current step */
  setCurrentStep: (step: number) => void
  /** Whether this page's tour has been completed */
  hasCompletedTour: (pageKey: string) => boolean
  /** Reset all completed tours (for "restart tutorial") */
  resetTours: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

// ─── Provider ───────────────────────────────────────────────────────

export function DashboardTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()
  const role = user?.role ?? "customer"

  const [isOpen, setIsOpen] = useState(false)
  const [activeSteps, setActiveSteps] = useState<StepType[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [activePageKey, setActivePageKey] = useState("")
  // Lazy initializer so the first client render already reflects localStorage
  // (avoids a setState-in-effect render cascade just to hydrate this).
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    } catch {
      return {}
    }
  })

  const startTour = useCallback(
    (steps: StepType[], pageKey: string) => {
      setActiveSteps(steps)
      setActivePageKey(pageKey)
      setCurrentStep(0)
      setIsOpen(true)
    },
    [],
  )

  const closeTour = useCallback(() => {
    setIsOpen(false)
    if (activePageKey && role) {
      setTourCompleted(role, activePageKey)
      setCompletionMap((prev) => ({ ...prev, [`${role}:${activePageKey}`]: true }))
    }
  }, [activePageKey, role])

  const hasCompletedTour = useCallback(
    (pageKey: string) => {
      return !!completionMap[`${role}:${pageKey}`]
    },
    [completionMap, role],
  )

  const resetTours = useCallback(() => {
    resetAllTours()
    setCompletionMap({})
  }, [])

  const value = useMemo<TourContextValue>(
    () => ({
      startTour,
      isOpen,
      closeTour,
      activeSteps,
      currentStep,
      setCurrentStep,
      hasCompletedTour,
      resetTours,
    }),
    [startTour, isOpen, closeTour, activeSteps, currentStep, hasCompletedTour, resetTours],
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useDashboardTour() {
  const ctx = useContext(TourContext)
  if (!ctx) {
    throw new Error("useDashboardTour must be used within <DashboardTourProvider>")
  }
  return ctx
}
