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
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const router = useRouter();

  function handleClick() {
    const query = serviceId ? `?service=${serviceId}` : "";
    const isCustomer = _hasHydrated && isAuthenticated && user?.role === "customer";
    const dest = isCustomer ? authenticatedHref ?? `/dashboard/customer/book${query}` : `/book${query}`;
    router.push(dest);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
