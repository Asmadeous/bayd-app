"use client"

import { useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { GoogleSignIn } from "@/features/auth/components/google-sign-in"
import type { AuthPageContent } from "@/features/auth/types"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"

type AuthPageProps = {
  content: AuthPageContent
}

export function AuthPage({ content }: AuthPageProps) {
  const searchParams = useSearchParams()
  const referralCode = searchParams.get("ref") ?? undefined
  const { register, staffLogin, requestMagicLink, requestPasswordReset } = useAuth()
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Two-step for staff/admin: after entering an email that belongs to a staff
  // account, requesting a magic link 403s and we reveal a password step.
  const [needsPassword, setNeedsPassword] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (content.mode === "signin") {
        if (needsPassword) {
          // Step 2 — staff/admin password.
          await staffLogin.mutateAsync({ email: values.email ?? "", password: values.password ?? "" })
          setSuccess("Welcome back. Opening your dashboard now.")
        } else {
          // Step 1 — email. Customers get a one-click sign-in link by email
          // (no instant token — proves inbox ownership first); staff emails
          // 403 → ask for password instead.
          try {
            await requestMagicLink.mutateAsync(values.email ?? "")
            setMagicLinkSent(true)
          } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status
            if (status === 403) {
              setNeedsPassword(true)
              setLoading(false)
              return
            }
            throw err
          }
        }
      } else if (content.mode === "signup") {
        const [first_name, ...rest] = (values.name ?? "").trim().split(" ")
        await register.mutateAsync({
          email: values.email ?? "",
          phone: values.phone || undefined,
          first_name: first_name ?? undefined,
          last_name: rest.join(" ") || undefined,
          avatar_url: values.avatar_url || undefined,
          street_address: values.street_address || undefined,
          city: values.city || undefined,
          country: values.country || "Canada",
          postal_code: values.postal_code || undefined,
          special_needs: values.special_needs === "true",
          referral_code: referralCode,
        })
        setSuccess("Your account has been created. Opening your dashboard now.")
      } else if (content.mode === "forgot") {
        await requestPasswordReset.mutateAsync(values.email ?? "")
        setSuccess(`Check your email — if ${values.email} has a staff account, a password reset link is on its way.`)
        setLoading(false)
        return
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data?.error ??
        (err as { response?: { data?: { errors?: string[] } } })?.response?.data?.errors?.join(", ") ??
        "Something went wrong. Please try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f4f1eb] text-[#101217]">
      <div className="grid h-screen lg:grid-cols-[minmax(0,1.7fr)_minmax(28rem,0.83fr)]">
        {/* Hero panel */}
        <section className="relative isolate hidden overflow-hidden p-4 text-white sm:p-6 lg:block lg:h-screen lg:p-8">
          <Image
            alt={content.hero.image.alt}
            className="-z-30 object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 68vw, 100vw"
            src={content.hero.image.src}
            unoptimized
          />
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(16,18,23,0.82),rgba(16,18,23,0.36)_58%,rgba(16,18,23,0.14))]" />
          <div className="absolute inset-x-0 bottom-0 -z-20 h-2/3 bg-[linear-gradient(180deg,transparent,rgba(16,18,23,0.78))]" />

          <div className="flex h-full flex-col justify-between">
            <Link
              className="inline-flex w-fit items-center gap-2 bg-white/12 px-4 py-3 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white hover:text-[#101217]"
              href="/"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back home
            </Link>

            <div className="max-w-4xl">
              <p className="inline-flex bg-white px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#101217]">
                {content.hero.badge}
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[0.94] tracking-tight sm:text-7xl">
                {content.hero.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                {content.hero.note}
              </p>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
                {content.hero.metrics.map((metric) => (
                  <div
                    className="border border-white/16 bg-white/10 p-4 backdrop-blur-md"
                    key={metric.label}
                  >
                    <p className="text-2xl font-extrabold">{metric.value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/62">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Form panel */}
        <section className="h-screen overflow-y-auto bg-[#f4f1eb] px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-xl">
            <Link
              className="mb-8 inline-flex items-center gap-2 text-sm font-extrabold text-[#5f6268] transition-colors hover:text-[#c96c83] lg:hidden"
              href="/"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back home
            </Link>

            <div>
              <Image
                alt="Beauty @ Your Door"
                className="mb-8 h-16 w-auto object-contain"
                height={936}
                priority
                src="/images/brand/bayd-logo-black.png"
                unoptimized
                width={3264}
              />
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#a36f4d]">
                {content.eyebrow}
              </p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                {content.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-[#5f6268]">
                {content.supportText}
              </p>
            </div>

            {magicLinkSent ? (
              <div className="mt-9 space-y-5">
                <p className="rounded-lg border border-[#5a9e5a]/25 bg-[#5a9e5a]/10 px-4 py-3 text-sm font-semibold text-[#3f7a3f]">
                  Check your email — we sent a sign-in link to {values.email}. It works once and
                  expires in 15 minutes.
                </p>
                <button
                  className="text-sm font-extrabold text-[#101217] transition-colors hover:text-[#c96c83]"
                  onClick={() => setMagicLinkSent(false)}
                  type="button"
                >
                  Use a different email
                </button>
              </div>
            ) : (
            <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
              {content.fields.map((field) => (
                <label className="block" key={field.name}>
                  <span className="text-sm font-extrabold text-[#101217]">
                    {field.label}
                  </span>
                  {field.type === "password" ? (
                    <PasswordInput
                      autoComplete={field.autoComplete}
                      className="mt-2 h-13 w-full border border-black/15 bg-white px-4 text-base font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                      name={field.name}
                      placeholder={field.placeholder}
                      required
                      value={values[field.name] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.name]: e.target.value }))
                      }
                    />
                  ) : (
                    <input
                      autoComplete={field.autoComplete}
                      className="mt-2 h-13 w-full border border-black/15 bg-white px-4 text-base font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                      name={field.name}
                      placeholder={field.placeholder}
                      required
                      type={field.type}
                      value={values[field.name] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.name]: e.target.value }))
                      }
                    />
                  )}
                </label>
              ))}

              {content.mode === "signin" && needsPassword ? (
                <label className="block">
                  <span className="text-sm font-extrabold text-[#101217]">Password</span>
                  <PasswordInput
                    autoComplete="current-password"
                    className="mt-2 h-13 w-full border border-black/15 bg-white px-4 text-base font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                    name="password"
                    placeholder="Enter your password"
                    required
                    value={values.password ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                  />
                  <span className="mt-1.5 block text-xs font-medium text-[#5f6268]">
                    This is a staff account — please enter your password.
                  </span>
                </label>
              ) : null}

              {/* Service address — signup only */}
              {content.mode === "signup" && (
                <div className="space-y-4 rounded-lg border border-black/10 bg-white/50 p-4">
                  <p className="text-sm font-extrabold text-[#101217]">
                    Service address
                    <span className="ml-2 text-xs font-normal text-[#8a8d93]">where we&apos;ll come to you</span>
                  </p>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#5f6268]">Street address</span>
                    <input
                      autoComplete="street-address"
                      required
                      className="mt-1.5 h-12 w-full border border-black/15 bg-white px-4 text-base font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                      placeholder="123 Queen St W"
                      value={values.street_address ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, street_address: e.target.value }))}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-[#5f6268]">City</span>
                      <input
                        autoComplete="address-level2"
                        required
                        className="mt-1.5 h-12 w-full border border-black/15 bg-white px-4 text-base font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                        placeholder="Toronto"
                        value={values.city ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-[#5f6268]">Postal code</span>
                      <input
                        autoComplete="postal-code"
                        required
                        className="mt-1.5 h-12 w-full border border-black/15 bg-white px-4 text-base font-semibold uppercase text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                        placeholder="M5V 2T6"
                        value={values.postal_code ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, postal_code: e.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#5f6268]">Country</span>
                    <input
                      autoComplete="country-name"
                      className="mt-1.5 h-12 w-full border border-black/15 bg-white px-4 text-base font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                      placeholder="Canada"
                      value={values.country ?? "Canada"}
                      onChange={(e) => setValues((v) => ({ ...v, country: e.target.value }))}
                    />
                  </label>
                </div>
              )}

              {/* Special-needs flag — signup only */}
              {content.mode === "signup" && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values.special_needs === "true"}
                    onChange={(e) => setValues((v) => ({ ...v, special_needs: e.target.checked ? "true" : "" }))}
                    className="mt-0.5 accent-[#c96c83]"
                  />
                  <span className="text-sm text-[#5f6268]">
                    <span className="font-semibold text-[#101217]">I have accessibility or special-needs requirements.</span>{" "}
                    We&apos;ll set up a short video call before your first visit to plan the service.
                  </span>
                </label>
              )}

              {/* Avatar URL — signup only */}
              {content.mode === "signup" && (
                <div>
                  <label className="block text-sm font-extrabold text-[#101217] mb-2">
                    Profile photo URL{" "}
                    <span className="text-xs font-normal text-[#8a8d93]">(optional)</span>
                  </label>
                  <div className="flex gap-3 items-center">
                    {values.avatar_url && (
                      <span
                        aria-label="Preview"
                        className="size-12 shrink-0 rounded-full border border-black/10 bg-cover bg-center"
                        role="img"
                        style={{ backgroundImage: `url(${values.avatar_url})` }}
                      />
                    )}
                    <input
                      type="url"
                      placeholder="https://example.com/your-photo.jpg"
                      className="h-13 w-full border border-black/15 bg-white px-4 text-base font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                      value={values.avatar_url ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, avatar_url: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-[#5a9e5a]/25 bg-[#5a9e5a]/10 px-4 py-3 text-sm font-semibold text-[#3f7a3f]">
                  {success}
                </p>
              )}

              {content.forgotPasswordHref ? (
                <div className="flex justify-end">
                  <Link
                    className="text-sm font-extrabold text-[#a36f4d] transition-colors hover:text-[#c96c83]"
                    href={content.forgotPasswordHref}
                  >
                    Forgot password?
                  </Link>
                </div>
              ) : null}

              <button
                className={cn(
                  buttonVariants(),
                  "h-13 w-full px-6 text-base font-bold disabled:opacity-60"
                )}
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait…"
                  : content.mode === "signin" && needsPassword
                    ? "Sign in"
                    : content.primaryAction}
              </button>
            </form>
            )}

            {content.mode !== "forgot" && !magicLinkSent && <GoogleSignIn />}

            <div className="mt-7 border-t border-black/10 pt-6">
              <p className="text-sm text-[#5f6268]">
                {content.alternateAction.text}{" "}
                <Link
                  className="font-extrabold text-[#101217] transition-colors hover:text-[#c96c83]"
                  href={content.alternateAction.href}
                >
                  {content.alternateAction.label}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
