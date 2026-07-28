"use client"

import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

export interface TeamReview {
  id: number
  rating: number
  body: string | null
  featured: boolean
  created_at: string
  reviewer_name: string
}

export interface TeamService {
  id: number
  name: string
  category_name: string
  duration_minutes: number
  price: string
}

export interface TeamMember {
  id: number
  name: string
  title: string | null
  bio: string | null
  photo_url: string | null
  years_experience: number | null
  average_rating: number | null
  reviews_count: number
}

export interface TeamMemberDetail extends TeamMember {
  reviews: TeamReview[]
  services: TeamService[]
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => api.get<{ data: TeamMember[] }>("/team").then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTeamMember(id: number | string) {
  return useQuery({
    queryKey: ["team-member", String(id)],
    queryFn: () => api.get<TeamMemberDetail>(`/team/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
