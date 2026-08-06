import { redirect } from "next/navigation"

export default function CustomerCalendarPage() {
  redirect("/dashboard/customer/bookings?view=calendar")
}
