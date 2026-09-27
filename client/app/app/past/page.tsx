"use client"

import { AppHeader } from "../app-header"
import { appScreenClass } from "../app-theme"
import { BookingsPanel } from "../bookings/page"

export default function AppPastBookingsScreen() {
  return (
    <div className={appScreenClass}>
      <AppHeader back title="Past bookings" />
      <div className="px-5">
        <BookingsPanel tab="past" />
      </div>
    </div>
  )
}
