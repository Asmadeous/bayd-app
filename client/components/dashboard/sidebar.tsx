"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Fuel,
  Gift,
  Handshake,
  Home,
  Images,
  Inbox,
  LogOut,
  Mail,
  MapPin,
  Menu,
  ReceiptText,
  Repeat2,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useAuth } from "@/lib/hooks/use-auth"

type NavItem = { label: string; href: string; icon: LucideIcon }
type NavGroup = { group: string; items: NavItem[] }

const customerNav: NavItem[] = [
  { label: "Overview", href: "/dashboard/customer", icon: Home },
  { label: "Calendar", href: "/dashboard/customer/calendar", icon: CalendarDays },
  // { label: "Bookings", href: "/dashboard/customer/bookings", icon: CalendarDays },
  { label: "Subscriptions", href: "/dashboard/customer/subscriptions", icon: Repeat2 },
  { label: "Notifications", href: "/dashboard/customer/notifications", icon: Bell },
  { label: "Addresses", href: "/dashboard/customer/addresses", icon: MapPin },
  { label: "Loyalty", href: "/dashboard/customer/loyalty", icon: Star },
  { label: "Gift Cards", href: "/dashboard/customer/gift-cards", icon: Gift },
  { label: "Orders", href: "/dashboard/customer/orders", icon: ShoppingBag },
  { label: "Transactions", href: "/dashboard/customer/transactions", icon: ReceiptText },
  { label: "Settings", href: "/dashboard/customer/settings", icon: Settings },
]

const employeeNav: NavItem[] = [
  { label: "Schedule", href: "/dashboard/employee", icon: CalendarDays },
  { label: "Shifts", href: "/dashboard/employee/shifts", icon: Clock3 },
  { label: "Gift Cards", href: "/dashboard/employee/gift-cards", icon: Gift },
  { label: "Profile", href: "/dashboard/employee/profile", icon: User },
  { label: "Reviews", href: "/dashboard/employee/reviews", icon: Star },
]

const adminNavGroups: NavGroup[] = [
  {
    group: "Dashboard",
    items: [
      { label: "Overview", href: "/dashboard/admin", icon: Home },
      { label: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
      { label: "Calendar", href: "/dashboard/admin/calendar", icon: CalendarDays },
    ],
  },
  {
    group: "People",
    items: [
      { label: "Customers", href: "/dashboard/admin/users", icon: User },
      { label: "Employees", href: "/dashboard/admin/employees", icon: Users },
      { label: "Partners", href: "/dashboard/admin/partners", icon: Handshake },
      { label: "Jobs", href: "/dashboard/admin/jobs", icon: BriefcaseBusiness },
    ],
  },
  {
    group: "Bookings",
    items: [
      { label: "Bookings", href: "/dashboard/admin/bookings", icon: Clock3 },
      { label: "Booking Requests", href: "/dashboard/admin/booking-requests", icon: Inbox },
      { label: "Subscriptions", href: "/dashboard/admin/subscriptions", icon: Repeat2 },
      { label: "Work-Scope Calls", href: "/dashboard/admin/meetings", icon: Video },
    ],
  },
  {
    group: "Workforce",
    items: [
      { label: "Fuel & Shifts", href: "/dashboard/admin/shifts", icon: Fuel },
      { label: "Staff Map", href: "/dashboard/admin/staff-locations", icon: MapPin },
    ],
  },
  {
    group: "Catalog",
    items: [
      { label: "Services", href: "/dashboard/admin/services", icon: Sparkles },
      { label: "Products", href: "/dashboard/admin/products", icon: ShoppingBag },
    ],
  },
  {
    group: "Commerce",
    items: [
      { label: "Orders", href: "/dashboard/admin/orders", icon: ReceiptText },
      { label: "Invoices", href: "/dashboard/admin/invoices", icon: FileText },
      { label: "Gift Cards", href: "/dashboard/admin/gift-cards", icon: Gift },
      { label: "Loyalty", href: "/dashboard/admin/loyalty", icon: Star },
      { label: "Tips", href: "/dashboard/admin/tips", icon: ReceiptText },
    ],
  },
  {
    group: "Content",
    items: [
      { label: "Blog Posts", href: "/dashboard/admin/blog", icon: FileText },
      { label: "Gallery", href: "/dashboard/admin/gallery", icon: Images },
      { label: "Reviews", href: "/dashboard/admin/reviews", icon: Star },
      { label: "Newsletter", href: "/dashboard/admin/newsletter", icon: Mail },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Service Areas", href: "/dashboard/admin/service-areas", icon: MapPin },
      { label: "Inquiries", href: "/dashboard/admin/inquiries", icon: Inbox },
      { label: "Callbacks", href: "/dashboard/admin/callbacks", icon: Inbox },
      { label: "Payments", href: "/dashboard/admin/settings", icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const isAdmin = user?.role === "admin"
  const roleLabel =
    user?.role === "admin" ? "Admin" : user?.role === "employee" ? "Employee" : "Customer"
  const fullName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : user?.email ?? "Account"

  function closeMobileNav() {
    setIsOpen(false)
  }

  function handleLogout() {
    closeMobileNav()
    logout()
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f1eb]/92 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={closeMobileNav}>
            <BrandMark tone="dark" />
          </Link>
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close dashboard navigation" : "Open dashboard navigation"}
            className="grid size-10 place-items-center border border-black/10 bg-white/75 text-[#101217] transition-colors hover:bg-white"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
      </header>

      {isOpen ? (
        <button
          aria-label="Close dashboard navigation"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={closeMobileNav}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[86vw] shrink-0 flex-col border-r border-white/10 bg-[#101217] text-white shadow-2xl shadow-black/25 transition-transform duration-300 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative isolate overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,rgba(240,200,211,0.12),transparent_42%)] px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={closeMobileNav}>
              <BrandMark tone="light" />
              <div>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Studio Desk
                </p>
              </div>
            </Link>
            <span className="border border-[#f0c8d3]/30 bg-[#c96c83] px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white">
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center overflow-hidden border border-white/10 bg-white/10">
              {user?.avatar_url ? (
                <span
                  aria-hidden="true"
                  className="size-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${user.avatar_url})` }}
                />
              ) : (
                <span className="text-sm font-extrabold text-white/70">
                  {(user?.first_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{fullName}</p>
              <p className="mt-0.5 truncate text-xs text-white/42">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav
          className={cn(
            "flex-1 overflow-y-auto px-3 py-4",
            isAdmin && "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {isAdmin ? (
            adminNavGroups.map((group) => (
              <div key={group.group} className="mb-5">
                <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[#f0c8d3]/55">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink item={item} key={item.href} onNavigate={closeMobileNav} pathname={pathname} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-1">
              {(user?.role === "employee" ? employeeNav : customerNav).map((item) => (
                <NavLink item={item} key={item.href} onNavigate={closeMobileNav} pathname={pathname} />
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            className="flex w-full items-center gap-3 px-3 py-3 text-sm font-semibold text-white/58 transition-colors hover:bg-white/6 hover:text-white"
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

function NavLink({
  item,
  onNavigate,
  pathname,
}: {
  item: NavItem
  onNavigate: () => void
  pathname: string
}) {
  const active = pathname === item.href
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-h-10 items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all",
        active
          ? "bg-[#c96c83] text-white shadow-lg shadow-[#c96c83]/18"
          : "text-white/58 hover:bg-white/6 hover:text-white",
      )}
      onClick={onNavigate}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4 shrink-0", active ? "text-white" : "text-[#f0c8d3]/70 group-hover:text-[#f0c8d3]")}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {active ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-white/75" /> : null}
    </Link>
  )
}

function BrandMark({ tone }: { tone: "dark" | "light" }) {
  return (
    <span className="relative block h-11 w-[5.3rem] shrink-0">
      <Image
        alt="Beauty @ Your Door"
        className="object-contain"
        fill
        priority
        src={tone === "light" ? "/images/brand/bayd-logo-white.png" : "/images/brand/bayd-logo-black.png"}
        unoptimized
      />
    </span>
  )
}
