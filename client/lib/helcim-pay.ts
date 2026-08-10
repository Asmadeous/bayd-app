// Loads HelcimPay.js and opens the payment modal for a checkout token.
//
// Flow: backend /checkout returns a checkoutToken → we load Helcim's script,
// call appendHelcimPayIframe(token) to show the pay overlay, and resolve when
// the customer finishes. The order is confirmed authoritatively by the backend
// webhook — this just drives the UI and reports success/failure/abort.

const SDK_URL = "https://secure.helcim.app/helcim-pay/services/start.js"

declare global {
  interface Window {
    appendHelcimPayIframe?: (checkoutToken: string, allowExit?: boolean) => void
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.appendHelcimPayIframe === "function") return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load HelcimPay")))
      return
    }
    const s = document.createElement("script")
    s.src = SDK_URL
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Failed to load HelcimPay"))
    document.head.appendChild(s)
  })
}

export type HelcimResult = "success" | "abort" | "error"

// Opens the modal and resolves once HelcimPay posts its terminal event.
// HelcimPay dispatches a window "message" whose data.eventName is
// `helcim-pay-js-<checkoutToken>` and data.eventStatus is SUCCESS | ABORTED | HIDE.
export async function openHelcimPay(checkoutToken: string): Promise<HelcimResult> {
  await loadScript()
  if (typeof window.appendHelcimPayIframe !== "function") {
    throw new Error("HelcimPay not available")
  }

  return new Promise<HelcimResult>((resolve) => {
    const eventName = `helcim-pay-js-${checkoutToken}`

    function onMessage(event: MessageEvent) {
      const data = event.data as { eventName?: string; eventStatus?: string } | undefined
      if (!data || data.eventName !== eventName) return

      if (data.eventStatus === "SUCCESS") {
        cleanup()
        resolve("success")
      } else if (data.eventStatus === "ABORTED" || data.eventStatus === "HIDE") {
        cleanup()
        resolve("abort")
      } else if (data.eventStatus === "ERROR") {
        cleanup()
        resolve("error")
      }
    }

    function cleanup() {
      window.removeEventListener("message", onMessage)
      // Remove the HelcimPay iframe overlay (the SDK auto-removes on HIDE but
      // not on SUCCESS/ERROR)
      const frame = document.getElementById("helcimPayIframe")
      if (frame) frame.remove()
    }

    window.addEventListener("message", onMessage)
    window.appendHelcimPayIframe!(checkoutToken, true)
  })
}
