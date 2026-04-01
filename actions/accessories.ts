"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateAccessoryBarcode } from "@/lib/barcode"

export type ActionResult = { success: true } | { error: string }

// Gerçek şema: barcode, brand, category, purchase_price, sale_price, stock_quantity
const addAccessorySchema = z.object({
  barcode: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  stock_quantity: z
    .string()
    .min(1, "Stok adedi zorunludur")
    .transform((v) => parseInt(v, 10))
    .refine((v) => !isNaN(v) && v >= 0, "Stok adedi 0 veya daha büyük olmalıdır"),
  purchase_price: z
    .string()
    .min(1, "Alış fiyatı zorunludur")
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v > 0, "Alış fiyatı 0'dan büyük olmalıdır"),
  sale_price: z
    .string()
    .min(1, "Satış fiyatı zorunludur")
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v > 0, "Satış fiyatı 0'dan büyük olmalıdır"),
})

const updateAccessorySchema = z.object({
  brand: z.string().optional(),
  category: z.string().optional(),
  stock_quantity: z
    .string()
    .min(1, "Stok adedi zorunludur")
    .transform((v) => parseInt(v, 10))
    .refine((v) => !isNaN(v) && v >= 0, "Stok adedi 0 veya daha büyük olmalıdır"),
  purchase_price: z
    .string()
    .min(1, "Alış fiyatı zorunludur")
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v > 0, "Alış fiyatı 0'dan büyük olmalıdır"),
  sale_price: z
    .string()
    .min(1, "Satış fiyatı zorunludur")
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v > 0, "Satış fiyatı 0'dan büyük olmalıdır"),
})

export async function addAccessory(formData: FormData): Promise<ActionResult> {
  const raw = {
    barcode: (formData.get("barcode") as string) || undefined,
    brand: (formData.get("brand") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    stock_quantity: formData.get("stock_quantity") as string,
    purchase_price: formData.get("purchase_price") as string,
    sale_price: formData.get("sale_price") as string,
  }

  const parsed = addAccessorySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const barcode = parsed.data.barcode || generateAccessoryBarcode()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("accessories") as any).insert({ ...parsed.data, barcode })

  if (error) {
    if (error.code === "23505") {
      return { error: "Bu barkod numarası zaten kayıtlı." }
    }
    return { error: "Aksesuar eklenirken bir hata oluştu." }
  }

  revalidatePath("/accessories")
  return { success: true }
}

export async function updateAccessory(id: string, formData: FormData): Promise<ActionResult> {
  const raw = {
    brand: (formData.get("brand") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    stock_quantity: formData.get("stock_quantity") as string,
    purchase_price: formData.get("purchase_price") as string,
    sale_price: formData.get("sale_price") as string,
  }

  const parsed = updateAccessorySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("accessories") as any)
    .update(parsed.data)
    .eq("id", id)

  if (error) {
    return { error: "Aksesuar güncellenirken bir hata oluştu." }
  }

  revalidatePath("/accessories")
  return { success: true }
}

export async function deleteAccessory(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("accessories") as any).delete().eq("id", id)

  if (error) {
    if (error.code === "23503") {
      return { error: "Bu aksesuara bağlı satış kayıtları mevcut olduğu için silinemez." }
    }
    return { error: "Aksesuar silinirken bir hata oluştu." }
  }

  revalidatePath("/accessories")
  return { success: true }
}
