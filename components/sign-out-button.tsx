"use client"

import { signOut } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button variant="ghost" size="sm" type="submit" className="w-full justify-start gap-2">
        <LogOut className="h-4 w-4" />
        Çıkış Yap
      </Button>
    </form>
  )
}
