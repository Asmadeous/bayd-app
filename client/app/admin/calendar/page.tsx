import { AdminCalendar } from "../admin-calendar"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, mutedClass } from "../admin-theme"

export default function AdminCalendarScreen() {
  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Company Calendar" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>
        Every booking across the business. Tap an appointment to manage it, or an empty time to book one.
      </p>
      <div className="px-5">
        <AdminCalendar />
      </div>
    </div>
  )
}
