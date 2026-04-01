"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Smartphone,
  Package,
  Users,
  ShoppingCart,
  BookOpen,
  BarChart2,
} from "lucide-react"

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/devices", label: "Cihazlar", icon: Smartphone },
  { href: "/accessories", label: "Aksesuarlar", icon: Package },
  { href: "/contacts", label: "Cariler", icon: Users },
  { href: "/sales", label: "Satışlar", icon: ShoppingCart },
  { href: "/catalog", label: "Katalog", icon: BookOpen },
  { href: "/reports", label: "Raporlar", icon: BarChart2 },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 p-2">
      {navLinks.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
