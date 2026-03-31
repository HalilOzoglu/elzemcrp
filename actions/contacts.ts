"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult = { success: true } | { error: string }

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const addContactSchema = z.object({
  name: z.string().min(1, "Ad zorunludur"),
  contact_type: z.enum(["CUSTOMER", "SUPPLIER"], {
    error: "Cari tipi zorunludur",
  }),
  phone: z.string().optional(),
})

const updateContactSchema = z.object({
  name: z.string().min(1, "Ad zorunludur"),
  contact_type: z.enum(["CUSTOMER", "SUPPLIER"], {
    error: "Cari tipi zorunludur",
  }),
  phone: z.string().optional(),
})

// ─── addContact ───────────────────────────────────────────────────────────────

export async function addContact(formData: FormData): Promise<ActionResult> {
  const raw = {
    name: formData.get("name") as string,
    contact_type: formData.get("contact_type") as string,
    phone: (formData.get("phone") as string) || undefined,
  }

  const parsed = addContactSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("contacts") as any).insert({
    full_name: parsed.data.name, // gerçek kolon adı
    contact_type: parsed.data.contact_type,
    phone: parsed.data.phone ?? null,
  })

  if (error) {
    return { error: "Cari eklenirken bir hata oluştu." }
  }

  revalidatePath("/contacts")
  return { success: true }
}

// ─── updateContact ────────────────────────────────────────────────────────────

export async function updateContact(id: string, formData: FormData): Promise<ActionResult> {
  const raw = {
    name: formData.get("name") as string,
    contact_type: formData.get("contact_type") as string,
    phone: (formData.get("phone") as string) || undefined,
  }

  const parsed = updateContactSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("contacts") as any)
    .update({
      full_name: parsed.data.name, // gerçek kolon adı
      contact_type: parsed.data.contact_type,
      phone: parsed.data.phone ?? null,
    })
    .eq("id", id)

  if (error) {
    return { error: "Cari güncellenirken bir hata oluştu." }
  }

  revalidatePath("/contacts")
  revalidatePath("/contacts/" + id)
  return { success: true }
}

// ─── deleteContact ────────────────────────────────────────────────────────────

export async function deleteContact(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("contacts") as any).delete().eq("id", id)

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Bu cariye ait satış kayıtları mevcut olduğu için silinemez. Önce ilgili satışları kaldırın.",
      }
    }
    return { error: "Cari silinirken bir hata oluştu." }
  }

  revalidatePath("/contacts")
  return { success: true }
}
