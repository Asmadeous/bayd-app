"use client"

import { useRouter } from "next/navigation"

import { ChangePasswordForm } from "@/components/change-password-form"
import { StaffHeader } from "../../staff-header"
import { cardClass, mutedClass, staffScreenClass } from "../../staff-theme"

export default function StaffChangePasswordScreen() {
  const router = useRouter()
  return (
    <div className={staffScreenClass}>
      <StaffHeader back title="Change password" />
      <div className="px-5">
        <section className={`${cardClass} p-4`}>
          <p className={`mb-3 text-sm ${mutedClass}`}>
            Enter your current password and choose a new one. You&apos;ll stay signed in.
          </p>
          <ChangePasswordForm onSuccess={() => router.back()} />
        </section>
      </div>
    </div>
  )
}
