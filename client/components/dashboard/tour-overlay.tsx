"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react"

import { useDashboardTour } from "@/lib/tours/tour-provider"
import { cn } from "@/lib/utils"

/**
 * Renders the active tour overlay:
 *  - A semi-transparent backdrop with a "spotlight" cut-out on the target element
 *  - A floating tooltip with the step description and prev/next/close controls
 *  - Keyboard navigation (Escape to close, ← → arrow keys)
 */
export function TourOverlay() {
  const { isOpen, activeSteps, currentStep, setCurrentStep, closeTour } = useDashboardTour()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const tooltipRef = useRef<HTMLDivElement>(null)

  const step = activeSteps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === activeSteps.length - 1

  // ─ Locate the target element ────────────────────────────────────
  const updateTargetRect = useCallback(() => {
    if (!step?.selector || typeof step.selector !== "string") {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(step.selector)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)

      // Scroll into view if needed
      const isVisible =
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth

      if (!isVisible) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
        // Re-read rect after scroll
        requestAnimationFrame(() => {
          const freshRect = el.getBoundingClientRect()
          setTargetRect(freshRect)
        })
      }
    } else {
      setTargetRect(null)
    }
  }, [step])

  useEffect(() => {
    if (!isOpen) return
    // Small delay so DOM settles (for dynamic content)
    const timer = setTimeout(updateTargetRect, 150)
    window.addEventListener("resize", updateTargetRect)
    window.addEventListener("scroll", updateTargetRect, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", updateTargetRect)
      window.removeEventListener("scroll", updateTargetRect, true)
    }
  }, [isOpen, currentStep, updateTargetRect])

  // ─ Position the tooltip ─────────────────────────────────────────
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) {
      setTooltipStyle({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" })
      return
    }

    const pad = 16
    const ttWidth = 380
    const ttHeight = tooltipRef.current.offsetHeight || 220
    const pos = typeof step?.position === "string" ? step.position : "bottom"
    const vpW = window.innerWidth
    const vpH = window.innerHeight

    let top = 0
    let left = 0

    switch (pos) {
      case "top":
        top = targetRect.top - ttHeight - pad
        left = targetRect.left + targetRect.width / 2 - ttWidth / 2
        break
      case "bottom":
        top = targetRect.bottom + pad
        left = targetRect.left + targetRect.width / 2 - ttWidth / 2
        break
      case "left":
        top = targetRect.top + targetRect.height / 2 - ttHeight / 2
        left = targetRect.left - ttWidth - pad
        break
      case "right":
        top = targetRect.top + targetRect.height / 2 - ttHeight / 2
        left = targetRect.right + pad
        break
      default:
        top = targetRect.bottom + pad
        left = targetRect.left + targetRect.width / 2 - ttWidth / 2
    }

    // Clamp to viewport
    if (left < pad) left = pad
    if (left + ttWidth > vpW - pad) left = vpW - ttWidth - pad
    if (top < pad) top = pad
    if (top + ttHeight > vpH - pad) top = vpH - ttHeight - pad

    setTooltipStyle({ top, left, width: ttWidth })
  }, [targetRect, step?.position, currentStep])

  // ─ Keyboard navigation ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeTour()
      if (e.key === "ArrowRight" && !isLast) setCurrentStep(currentStep + 1)
      if (e.key === "ArrowLeft" && !isFirst) setCurrentStep(currentStep - 1)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, closeTour, isFirst, isLast, currentStep, setCurrentStep])

  if (!isOpen || activeSteps.length === 0) return null

  const spotlight = targetRect
    ? {
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999]"
          style={{ pointerEvents: "auto" }}
        >
          {/* Backdrop */}
          <svg className="fixed inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
            <defs>
              <mask id="tour-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlight && (
                  <rect
                    x={spotlight.left}
                    y={spotlight.top}
                    width={spotlight.width}
                    height={spotlight.height}
                    rx={6}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.55)"
              mask="url(#tour-spotlight-mask)"
              style={{ pointerEvents: "auto" }}
            />
          </svg>

          {/* Spotlight border glow */}
          {spotlight && (
            <div
              className="pointer-events-none fixed rounded-md ring-2 ring-[#c96c83] ring-offset-2 ring-offset-transparent"
              style={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            key={currentStep}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed z-[10000] overflow-hidden border border-black/10 bg-white shadow-2xl shadow-black/20"
            style={tooltipStyle}
          >
            {/* Header gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#c96c83] via-[#d4a843] to-[#c96c83]" />

            {/* Close button */}
            <button
              onClick={closeTour}
              className="absolute right-2 top-3 grid size-7 place-items-center text-[#5f6268] transition-colors hover:bg-black/5 hover:text-[#101217]"
              aria-label="Close tour"
              type="button"
            >
              <X className="size-4" />
            </button>

            {/* Step content */}
            <div className="px-5 pb-2 pt-4">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center bg-[#c96c83] text-white">
                  <Sparkles className="size-3" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#c96c83]">
                  Step {currentStep + 1} of {activeSteps.length}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#3a3d42]">
                {typeof step?.content === "string" ? step.content : ""}
              </p>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center justify-between border-t border-black/8 px-5 py-3">
              <div className="flex gap-1">
                {activeSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={cn(
                      "size-2 rounded-full transition-all",
                      i === currentStep
                        ? "w-5 bg-[#c96c83]"
                        : "bg-black/15 hover:bg-black/30",
                    )}
                    aria-label={`Go to step ${i + 1}`}
                    type="button"
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="inline-flex h-8 items-center gap-1 border border-black/15 bg-white px-3 text-xs font-bold text-[#101217] transition-colors hover:bg-[#f4f1eb]"
                    type="button"
                  >
                    <ChevronLeft className="size-3" />
                    Back
                  </button>
                )}
                {isLast ? (
                  <button
                    onClick={closeTour}
                    className="inline-flex h-8 items-center gap-1 bg-[#c96c83] px-4 text-xs font-bold text-white transition-colors hover:bg-[#b85f74]"
                    type="button"
                  >
                    Finish Tour
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="inline-flex h-8 items-center gap-1 bg-[#101217] px-4 text-xs font-bold text-white transition-colors hover:bg-[#2a2d33]"
                    type="button"
                  >
                    Next
                    <ChevronRight className="size-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full bg-black/5">
              <motion.div
                className="h-full bg-[#c96c83]"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentStep + 1) / activeSteps.length) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
