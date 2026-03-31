"use client"

import { useActionState } from "react"
import { signIn, type SignInState } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: SignInState = {}

export default function LoginPage() {
  const [state, action, isPending] = useActionState(signIn, initialState)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Elzem İletişim</h1>
          <p className="text-sm text-muted-foreground">Hesabınıza giriş yapın</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@mail.com"
              autoComplete="email"
              required
              aria-invalid={!!state.error}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              aria-invalid={!!state.error}
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Giriş yapılıyor…" : "Giriş Yap"}
          </Button>
        </form>
      </div>
    </div>
  )
}
