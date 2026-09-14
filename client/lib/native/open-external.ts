import { Capacitor } from "@capacitor/core"

// Open an external URL (e.g. a Square hosted-payment page) the right way per
// platform. On native (Capacitor) the WebView must NOT navigate away to an
// external origin - that strands the app - so we open it in the system / in-app
// browser via @capacitor/browser. On web it's a normal same-tab navigation,
// which is what the website already does for the payment redirect.
//
// onFinished (native only): fires when the in-app browser is closed, so a caller
// can move the app off the payment screen once the user is done paying. Without
// it the app sits on the booking form after the browser closes even though the
// backend webhook has already confirmed the booking. No-op on web, where the
// same-tab redirect means this function never returns to the caller anyway.
export async function openPaymentUrl(url: string, onFinished?: () => void): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const mod = await import("@capacitor/browser").catch(() => null)
      if (mod?.Browser) {
        if (onFinished) {
          const handle = await mod.Browser.addListener("browserFinished", () => {
            handle.remove()
            onFinished()
          })
        }
        await mod.Browser.open({ url })
        return
      }
    } catch {
      // fall through
    }
    // Fallback if the plugin isn't available for some reason.
    window.open(url, "_blank", "noopener,noreferrer")
    return
  }
  // Web: same-tab redirect (unchanged website behavior).
  window.location.href = url
}
