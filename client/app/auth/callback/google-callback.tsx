"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import api from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/stores/auth-store";

function roleDashboard(role: string) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "employee") return "/dashboard/employee";
  return "/dashboard/customer";
}

// Landing page for the Google OAuth backend-redirect flow. The API sends the
// browser here as /auth/callback?token=<jwt>. We stash the token, fetch the
// user with it, then route to the right dashboard.
export function GoogleCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(
    token ? null : "Sign-in failed. Please try again."
  );

  useEffect(() => {
    if (!token) return;

    // Set the token first so the api client attaches it to the /auth/me call.
    useAuthStore.setState({ token });

    api
      .get<AuthUser>("/auth/me")
      .then((r) => {
        useAuthStore.getState().setAuth(r.data, token);
        router.replace(roleDashboard(r.data.role));
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        setError("Could not complete sign-in. Please try again.");
      });
  }, [token, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-[#5f6268]">
      {error ?? "Signing you in…"}
    </div>
  );
}
