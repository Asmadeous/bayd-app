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
    let settled = false

    function onMessage(event: MessageEvent) {
      const data = event.data as { eventName?: string; eventStatus?: string } | undefined
      if (!data || data.eventName !== eventName) return

      if (data.eventStatus === "SUCCESS") {
        finish("success")
      } else if (data.eventStatus === "ABORTED" || data.eventStatus === "HIDE") {
        finish("abort")
      } else if (data.eventStatus === "ERROR") {
        finish("error")
      }
    }

    function finish(result: HelcimResult) {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    function cleanup() {
      window.removeEventListener("message", onMessage)
      // Remove the HelcimPay iframe overlay (the SDK auto-removes on HIDE but
      // not on SUCCESS/ERROR) and our own close button.
      document.getElementById("helcimPayIframe")?.remove()
      closeBtn?.remove()
    }

    // HelcimPay's own error state ("Unable to load…") doesn't always post an
    // event, leaving the iframe overlay stuck with no exit. Inject our OWN close
    // button on top so the user can always dismiss it (resolves as "abort").
    const closeBtn = document.createElement("button")
    closeBtn.setAttribute("aria-label", "Close payment")
    closeBtn.textContent = "✕"
    closeBtn.style.cssText = [
      "position:fixed", "top:calc(env(safe-area-inset-top) + 12px)", "right:16px",
      "z-index:2147483647", "width:40px", "height:40px", "border-radius:9999px",
      "border:none", "background:rgba(20,16,15,0.75)", "color:#fff",
      "font-size:20px", "line-height:40px", "cursor:pointer",
    ].join(";")
    closeBtn.onclick = () => finish("abort")

    window.addEventListener("message", onMessage)
    window.appendHelcimPayIframe!(checkoutToken, true)
    // Add the close button after the iframe is in the DOM so it stacks on top.
    setTimeout(() => document.body.appendChild(closeBtn), 300)
  })
}
