import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Coins,
  FileText,
  Flag,
  Fuel,
  Gift,
  Globe2,
  Handshake,
  Home,
  Images,
  Inbox,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  ReceiptText,
  Repeat2,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"

import type { NavBadge } from "@/lib/hooks/use-nav-badges"

export type NavItem = { label: string; href: string; icon: LucideIcon; badge?: NavBadge }
export type NavGroup = { group: string; items: NavItem[] }

// The admin dashboard's menu, shared by the web sidebar and the BAYD Admin
// app's drawer so both always offer the same sections in the same order.

// Only for super admins: every franchise.
const superNavGroup: NavGroup = {
  group: "Franchises",
  items: [
    { label: "Franchises", href: "/dashboard/admin/franchises", icon: Globe2 },
    { label: "All branches", href: "/dashboard/admin/branches", icon: LayoutGrid },
    { label: "Royalties", href: "/dashboard/admin/royalties", icon: Coins },
  ],
}

export const adminNavGroups: NavGroup[] = [
  {
    group: "Dashboard",
    items: [
      { label: "Overview", href: "/dashboard/admin", icon: Home },
      { label: "Notifications", href: "/dashboard/admin/notifications", icon: Bell, badge: "notifications" },
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
      { label: "Messages", href: "/dashboard/admin/messages", icon: MessageCircle, badge: "messages" },
      { label: "Support Chat", href: "/dashboard/admin/support", icon: MessageCircle },
      { label: "Chat Reports", href: "/dashboard/admin/chat-reports", icon: Flag, badge: "chatReports" },
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
      { label: "Blog Comments", href: "/dashboard/admin/blog-comments", icon: MessageCircle },
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
      { label: "Royalties", href: "/dashboard/admin/royalties", icon: Coins },
    ],
  },
]

// Super admins get the franchise console first; its Royalties replaces the
// branch-level link in Settings.
export const superAdminNavGroups: NavGroup[] = [
  superNavGroup,
  ...adminNavGroups.map((g) => ({ ...g, items: g.items.filter((item) => item.href !== "/dashboard/admin/royalties") })),
]
