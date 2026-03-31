"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type SignInState = {
  error?: string
}

export async function signIn(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "Geçersiz e-posta veya şifre." }
  }

  redirect("/")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
