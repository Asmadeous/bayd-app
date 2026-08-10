"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/stores/auth-store";

interface BookButtonProps {
  children: ReactNode;
  className?: string;
  serviceId?: string | number;
  authenticatedHref?: string;
}

export function BookButton({
  children,
  className,
  serviceId,
  authenticatedHref,
}: BookButtonProps) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  function handleClick() {
    const query = serviceId ? `?service=${serviceId}` : "";
    // Guests book on the public page — no login required.
    if (!_hasHydrated || !isAuthenticated) {
      router.push(`/book${query}`);
      return;
    }
    const dest = authenticatedHref ?? `/dashboard/customer/book${query}`;
    router.push(dest);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
