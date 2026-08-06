"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useAuth } from "@/lib/hooks/use-auth"

type NavItem = { label: string; href: string; icon: React.ReactNode }

const customerNav: NavItem[] = [
  { label: "Overview", href: "/dashboard/customer", icon: <HomeIcon /> },
  { label: "Calendar", href: "/dashboard/customer/calendar", icon: <CalendarIcon /> },
  { label: "Bookings", href: "/dashboard/customer/bookings", icon: <BookmarkIcon /> },
  { label: "Subscriptions", href: "/dashboard/customer/subscriptions", icon: <RepeatIcon /> },
  { label: "Notifications", href: "/dashboard/customer/notifications", icon: <BellIcon /> },
  { label: "Addresses", href: "/dashboard/customer/addresses", icon: <MapPinIcon /> },
  { label: "Loyalty", href: "/dashboard/customer/loyalty", icon: <StarIcon /> },
  { label: "Gift Cards", href: "/dashboard/customer/gift-cards", icon: <GiftIcon /> },
  { label: "Orders", href: "/dashboard/customer/orders", icon: <ShoppingBagIcon /> },
  { label: "Transactions", href: "/dashboard/customer/transactions", icon: <ReceiptIcon /> },
  { label: "Settings", href: "/dashboard/customer/settings", icon: <CogIcon /> },
]

const employeeNav: NavItem[] = [
  { label: "My Schedule", href: "/dashboard/employee", icon: <CalendarIcon /> },
  { label: "Shifts", href: "/dashboard/employee/shifts", icon: <ClockIcon /> },
  { label: "Gift Cards", href: "/dashboard/employee/gift-cards", icon: <GiftIcon /> },
  { label: "Profile", href: "/dashboard/employee/profile", icon: <UserIcon /> },
  { label: "Reviews", href: "/dashboard/employee/reviews", icon: <StarIcon /> },
]

type NavGroup = { group: string; items: NavItem[] }

const adminNavGroups: NavGroup[] = [
  {
    group: "Dashboard",
    items: [
      { label: "Overview", href: "/dashboard/admin", icon: <HomeIcon /> },
      { label: "Analytics", href: "/dashboard/admin/analytics", icon: <ChartIcon /> },
      { label: "Calendar", href: "/dashboard/admin/calendar", icon: <CalendarIcon /> },
    ],
  },
  {
    group: "People",
    items: [
      { label: "Customers", href: "/dashboard/admin/users", icon: <UserIcon /> },
      { label: "Employees", href: "/dashboard/admin/employees", icon: <UsersIcon /> },
      { label: "Partners", href: "/dashboard/admin/partners", icon: <HandshakeIcon /> },
      { label: "Jobs", href: "/dashboard/admin/jobs", icon: <BriefcaseIcon /> },
    ],
  },
  {
    group: "Bookings",
    items: [
      { label: "Bookings", href: "/dashboard/admin/bookings", icon: <BookmarkIcon /> },
      { label: "Booking Requests", href: "/dashboard/admin/booking-requests", icon: <ClockIcon /> },
      { label: "Subscriptions", href: "/dashboard/admin/subscriptions", icon: <RepeatIcon /> },
      { label: "Work-Scope Calls", href: "/dashboard/admin/meetings", icon: <VideoIcon /> },
    ],
  },
  {
    group: "Workforce",
    items: [
      { label: "Fuel & Shifts", href: "/dashboard/admin/shifts", icon: <FuelIcon /> },
      { label: "Staff Map", href: "/dashboard/admin/staff-locations", icon: <MapPinIcon /> },
    ],
  },
  {
    group: "Catalog",
    items: [
      { label: "Services", href: "/dashboard/admin/services", icon: <SparkleIcon /> },
      { label: "Products", href: "/dashboard/admin/products", icon: <ShoppingBagIcon /> },
    ],
  },
  {
    group: "Commerce",
    items: [
      { label: "Orders", href: "/dashboard/admin/orders", icon: <ReceiptIcon /> },
      { label: "Invoices", href: "/dashboard/admin/invoices", icon: <DocumentIcon /> },
      { label: "Gift Cards", href: "/dashboard/admin/gift-cards", icon: <GiftIcon /> },
      { label: "Loyalty", href: "/dashboard/admin/loyalty", icon: <StarIcon /> },
      { label: "Tips", href: "/dashboard/admin/tips", icon: <ReceiptIcon /> },
    ],
  },
  {
    group: "Content",
    items: [
      { label: "Blog Posts", href: "/dashboard/admin/blog", icon: <DocumentIcon /> },
      { label: "Gallery", href: "/dashboard/admin/gallery", icon: <GalleryIcon /> },
      { label: "Reviews", href: "/dashboard/admin/reviews", icon: <StarIcon /> },
      { label: "Newsletter", href: "/dashboard/admin/newsletter", icon: <MailIcon /> },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Service Areas", href: "/dashboard/admin/service-areas", icon: <MapPinIcon /> },
      { label: "Inquiries", href: "/dashboard/admin/inquiries", icon: <InboxIcon /> },
      { label: "Callbacks", href: "/dashboard/admin/callbacks", icon: <InboxIcon /> },
      { label: "Payments", href: "/dashboard/admin/settings", icon: <DocumentIcon /> },
    ],
  },
]

// Flat list for non-grouped roles
const adminNav: NavItem[] = adminNavGroups.flatMap((g) => g.items)

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { logout } = useAuth()

  const isAdmin = user?.role === "admin"
  const nav = isAdmin ? adminNav : user?.role === "employee" ? employeeNav : customerNav

  const roleLabel =
    user?.role === "admin" ? "Admin" : user?.role === "employee" ? "Employee" : "Customer"

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5"
        )}
        style={active ? { background: "#c96c83" } : undefined}
      >
        <span className="shrink-0">{item.icon}</span>
        {item.label}
      </Link>
    )
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col" style={{ background: "#101217" }}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-white/8">
        <Image
          alt="Beauty at Your Door"
          className="h-10 w-auto object-contain"
          height={936}
          src="/images/brand/bayd-logo-white.png"
          unoptimized
          width={3264}
        />
        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#c96c83", color: "#fff" }}>
          {roleLabel}
        </span>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/8 flex items-center gap-3">
        <div className="size-9 rounded-full overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="size-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-white/60">
              {(user?.first_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white/90 text-sm font-medium truncate">
            {user?.first_name ? `${user.first_name} ${user.last_name ?? ""}`.trim() : user?.email}
          </p>
          <p className="text-white/40 text-xs truncate">{user?.email}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {isAdmin ? (
          adminNavGroups.map((group) => (
            <div key={group.group} className="mb-4">
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => <NavLink key={item.href} item={item} />)}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-0.5">
            {nav.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
              style={active ? { background: "#c96c83" } : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/8">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
        >
          <LogOutIcon />
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ── Icons ───────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  )
}
function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
function ShoppingBagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
function CogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}
function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
function RepeatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c-1 3-3 5-6 6 3 1 5 3 6 6 1-3 3-5 6-6-3-1-5-3-6-6z" />
    </svg>
  )
}
function ReceiptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" /><line x1="16" y1="8" x2="8" y2="8" /><line x1="16" y1="12" x2="8" y2="12" /><line x1="16" y1="16" x2="12" y2="16" />
    </svg>
  )
}
function GiftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" /><rect width="20" height="5" x="2" y="7" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
function GalleryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}
function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" />
    </svg>
  )
}
function FuelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="15" y2="22" /><line x1="4" y1="9" x2="14" y2="9" /><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" /><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
    </svg>
  )
}
function HandshakeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" />
    </svg>
  )
}
