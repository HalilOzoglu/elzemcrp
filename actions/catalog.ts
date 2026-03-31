"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const brandSchema = z.object({
  name: z.string().min(1, "Marka adı zorunludur"),
})

const modelSchema = z.object({
  brand_id: z.string().min(1, "Marka seçimi zorunludur"),
  name: z.string().min(1, "Model adı zorunludur"),
})

const variantSchema = z.object({
  model_id: z.string().min(1, "Model seçimi zorunludur"),
  color: z.string().min(1, "Renk zorunludur"),
  storage: z.string().min(1, "Hafıza zorunludur"),
})

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionResult = { success: true } | { error: string }

// ─── FK Error Helper ─────────────────────────────────────────────────────────

function isFkError(error: { code?: string }): boolean {
  return error.code === "23503"
}

// ─── Brand Actions ───────────────────────────────────────────────────────────

export async function addBrand(formData: FormData): Promise<ActionResult> {
  const parsed = brandSchema.safeParse({ name: formData.get("name") })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("brands") as any).insert({ name: parsed.data.name })

  if (error) {
    return { error: "Marka eklenirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}

export async function updateBrand(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = brandSchema.safeParse({ name: formData.get("name") })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("brands") as any)
    .update({ name: parsed.data.name })
    .eq("id", id)

  if (error) {
    return { error: "Marka güncellenirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("brands") as any).delete().eq("id", id)

  if (error) {
    if (isFkError(error)) {
      return {
        error:
          "Bu markaya bağlı modeller mevcut olduğu için silinemez. Önce modelleri silin.",
      }
    }
    return { error: "Marka silinirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}

// ─── Model Actions ───────────────────────────────────────────────────────────

export async function addModel(formData: FormData): Promise<ActionResult> {
  const parsed = modelSchema.safeParse({
    brand_id: formData.get("brand_id"),
    name: formData.get("name"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("models") as any).insert(parsed.data)

  if (error) {
    return { error: "Model eklenirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}

export async function updateModel(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = modelSchema.safeParse({
    brand_id: formData.get("brand_id"),
    name: formData.get("name"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("models") as any)
    .update({ name: parsed.data.name, brand_id: parsed.data.brand_id })
    .eq("id", id)

  if (error) {
    return { error: "Model güncellenirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}

export async function deleteModel(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("models") as any).delete().eq("id", id)

  if (error) {
    if (isFkError(error)) {
      return {
        error:
          "Bu modele bağlı varyantlar mevcut olduğu için silinemez. Önce varyantları silin.",
      }
    }
    return { error: "Model silinirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}

// ─── Variant Actions ─────────────────────────────────────────────────────────

export async function addVariant(formData: FormData): Promise<ActionResult> {
  const parsed = variantSchema.safeParse({
    model_id: formData.get("model_id"),
    color: formData.get("color"),
    storage: formData.get("storage"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("model_variants") as any).insert(parsed.data)

  if (error) {
    return { error: "Varyant eklenirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}

export async function updateVariant(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = variantSchema.safeParse({
    model_id: formData.get("model_id"),
    color: formData.get("color"),
    storage: formData.get("storage"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("model_variants") as any)
    .update({ color: parsed.data.color, storage: parsed.data.storage, model_id: parsed.data.model_id })
    .eq("id", id)

  if (error) {
    return { error: "Varyant güncellenirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}

export async function deleteVariant(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("model_variants") as any).delete().eq("id", id)

  if (error) {
    if (isFkError(error)) {
      return {
        error:
          "Bu varyanta bağlı cihazlar mevcut olduğu için silinemez. Önce cihazları silin.",
      }
    }
    return { error: "Varyant silinirken bir hata oluştu." }
  }

  revalidatePath("/catalog")
  return { success: true }
}
