import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SignOutButton } from "@/components/sign-out-button"
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts-provider"
import { SidebarNav } from "@/components/nav-link"

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

        <SidebarNav />

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
