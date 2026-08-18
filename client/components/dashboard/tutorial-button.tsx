"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { FileText, Repeat2, Sparkles, X } from "lucide-react"
import type { StepType } from "@reactour/tour"

import { useDashboardTour } from "@/lib/tours/tour-provider"
import { cn } from "@/lib/utils"

interface TutorialButtonProps {
  /** The tour steps to run when the user clicks "Start Tutorial" */
  steps: StepType[]
  /** Unique key for this page's tour (used for completion tracking) */
  pageKey: string
  /** Optional label override */
  label?: string
  /** Optional className for positioning override */
  className?: string
}

/**
 * A floating action button that allows staff, admin, or customer to manually
 * trigger the guided tour for the current dashboard page.
 *
 * Shows a small panel with:
 *  - Start Tutorial (first time)
 *  - Restart Tutorial (if already completed)
 *  - Step count badge
 */
export function TutorialButton({
  steps,
  pageKey,
  label = "Tutorial",
  className,
}: TutorialButtonProps) {
  const { startTour, hasCompletedTour, isOpen } = useDashboardTour()
  const [expanded, setExpanded] = useState(false)
  const completed = hasCompletedTour(pageKey)

  function handleStart() {
    setExpanded(false)
    // Small delay so the panel closes before the tour begins
    setTimeout(() => startTour(steps, pageKey), 200)
  }

  // Don't show the button while a tour is active
  if (isOpen) return null

  return (
    <div className={cn("fixed bottom-6 right-6 z-[9990]", className)}>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-3 w-72 overflow-hidden border border-black/10 bg-white shadow-2xl shadow-black/15"
          >
            {/* Header */}
            <div className="relative bg-[linear-gradient(135deg,#c96c83,#a35569)] px-5 py-4 text-white">
              <button
                onClick={() => setExpanded(false)}
                className="absolute right-2 top-2 grid size-6 place-items-center text-white/60 transition-colors hover:text-white"
                aria-label="Close tutorial panel"
                type="button"
              >
                <X className="size-3.5" />
              </button>
              <div className="flex items-center gap-2">
                <FileText className="size-5" />
                <span className="text-sm font-extrabold">Dashboard Tutorial</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/75">
                Get a guided walkthrough of every feature on this page.
              </p>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">
                    {completed ? "Tour completed" : "Ready to learn"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#101217]">
                    {steps.length} interactive steps
                  </p>
                </div>
                <span className="grid size-10 place-items-center bg-[#c96c83]/10 text-[#c96c83]">
                  {completed ? (
                    <Repeat2 className="size-4" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </span>
              </div>

              <button
                onClick={handleStart}
                className="mt-4 flex w-full items-center justify-center gap-2 bg-[#101217] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2a2d33]"
                type="button"
              >
                {completed ? (
                  <>
                    <Repeat2 className="size-3.5" />
                    Restart Tutorial
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Start Tutorial
                  </>
                )}
              </button>

              {completed && (
                <p className="mt-3 text-center text-xs font-medium text-[#5a9e5a]">
                  ✓ You&apos;ve completed this tour
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex items-center gap-2 bg-[#c96c83] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#c96c83]/25 transition-colors hover:bg-[#b85f74]",
          expanded && "bg-[#101217] shadow-black/20 hover:bg-[#2a2d33]",
        )}
        aria-label={label}
        type="button"
      >
        <FileText className="size-4" />
        {label}
        {!completed && (
          <span className="grid size-5 place-items-center bg-white/20 text-[0.6rem] font-extrabold">
            {steps.length}
          </span>
        )}
      </motion.button>
    </div>
  )
}

