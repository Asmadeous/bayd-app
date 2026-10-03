"use client"

import { useQuery } from "@tanstack/react-query"

import api from "@/lib/api"

interface FranchiseLegal { privacy_body: string | null; terms_body: string | null }

// A franchise's own privacy policy or terms, written in the super admin console,
// shown instead of the default text. Plain text: blank lines split paragraphs,
// "## " starts a heading and "- " a list item.
export function FranchiseLegalText({ kind, children }: { kind: "privacy" | "terms"; children: React.ReactNode }) {
  const { data } = useQuery<FranchiseLegal>({
    queryKey: ["franchise-legal"],
    queryFn: () => api.get<FranchiseLegal>("/franchise/legal").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })
  const body = kind === "privacy" ? data?.privacy_body : data?.terms_body
  if (!body?.trim()) return <>{children}</>

  return (
    <>
      {body.trim().split(/\n\s*\n/).map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean)
        if (lines[0]?.startsWith("## ")) return <h2 key={i}>{lines[0].slice(3)}</h2>
        if (lines.every((l) => l.startsWith("- "))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>
        }
        return <p key={i}>{lines.join(" ")}</p>
      })}
    </>
  )
}
