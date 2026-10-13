import type { ChatReportPerson } from "@/lib/hooks/use-chat-reports"
import { mutedClass } from "../admin-theme"

const ROLE_LABEL: Record<string, string> = { customer: "Client", employee: "Technician", partner: "Partner", admin: "Admin" }

// "Name (Role, email)" for the people in a chat report.
export function Person({ person }: { person: ChatReportPerson }) {
  return (
    <span>
      <span className="font-bold">{person.name}</span>{" "}
      <span className={mutedClass}>
        ({ROLE_LABEL[person.role] ?? person.role}
        {person.email ? `, ${person.email}` : ""})
      </span>
    </span>
  )
}
