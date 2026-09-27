// Turns a failed sign-in request into a message that says what actually went
// wrong, so a rate limit or a dropped connection isn't reported as a bad code.
// `step` is what the person was doing: sending a code, entering it, or using a
// passkey.

export type AuthStep = "send" | "verify" | "passkey"
export type AuthErrorMessage = { title: string; description: string } | null

type ApiFailure = {
  name?: string
  response?: { status?: number; data?: { error?: string } }
}

export function authErrorMessage(e: unknown, step: AuthStep): AuthErrorMessage {
  const err = (e ?? {}) as ApiFailure

  // The person closed the passkey prompt themselves; nothing to report.
  if (step === "passkey" && (err.name === "NotAllowedError" || err.name === "AbortError")) return null

  const status = err.response?.status
  const serverMessage = err.response?.data?.error

  if (!err.response) {
    return { title: "Can't reach BAYD", description: "Check your internet connection and try again." }
  }
  if (status === 429) {
    // The resend cooldown has its own wording; the general limit says "Too many requests".
    const cooldown = serverMessage && serverMessage !== "Too many requests"
    return {
      title: "Too many attempts",
      description: cooldown ? serverMessage : "For your security, wait a minute and try again.",
    }
  }
  if (status && status >= 500) {
    return { title: "Something went wrong on our side", description: "Try again in a moment." }
  }
  if (step === "verify" && status === 401) {
    return { title: "That code didn't work", description: "It's wrong or has expired. Check it or request a new one." }
  }
  if (step === "passkey") {
    return { title: "Couldn't sign in with a passkey", description: "Use the email or phone option." }
  }
  if (serverMessage) {
    return { title: step === "send" ? "Couldn't send the code" : "Couldn't sign you in", description: serverMessage }
  }
  return {
    title: step === "send" ? "Couldn't send the code" : "Couldn't sign you in",
    description: "Check your details and try again.",
  }
}
