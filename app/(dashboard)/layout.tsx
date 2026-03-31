import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { SignOutButton } from "@/components/sign-out-button"
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts-provider"
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-4">
          <h1 className="text-base font-semibold">Elzem İletişim</h1>
          <p className="text-xs text-muted-foreground">POS / ERP</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
      </main>
    </div>
  )
}
