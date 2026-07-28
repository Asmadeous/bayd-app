"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import api from "@/lib/api"

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "internship"

export interface JobPosting {
  id: number
  title: string
  slug: string
  department: string | null
  location: string | null
  employment_type: EmploymentType
  description: string | null
  requirements: string | null
  salary_min: string | null
  salary_max: string | null
  posted_at: string | null
}

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
}

export function useJobs(filters?: { employment_type?: string; department?: string; location?: string }) {
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => api.get<{ data: JobPosting[] }>("/jobs", { params: filters }).then((r) => r.data.data),
  })
}

export function useJob(slug: string) {
  return useQuery({
    queryKey: ["job", slug],
    queryFn: () => api.get<JobPosting>(`/jobs/${slug}`).then((r) => r.data),
    enabled: !!slug,
  })
}

export function useApplyToJob(slug: string) {
  return useMutation({
    mutationFn: (data: {
      name: string
      email: string
      phone?: string
      message?: string
      documents: File[]
    }) => {
      const fd = new FormData()
      fd.append("name", data.name)
      fd.append("email", data.email)
      if (data.phone) fd.append("phone", data.phone)
      if (data.message) fd.append("message", data.message)
      data.documents.forEach((file) => fd.append("documents[]", file))
      return api
        .post(`/jobs/${slug}/apply`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        .then((r) => r.data)
    },
  })
}
