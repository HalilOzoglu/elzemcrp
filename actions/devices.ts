"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateDeviceBarcode } from "@/lib/barcode"

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionResult = { success: true } | { error: string }

// ─── Shared IMEI validation helper ───────────────────────────────────────────

function validateImeis(
  imei1: string | null,
  imei2: string | null,
  isDualSim: boolean,
  ctx: z.RefinementCtx
) {
  // IMEI 1 format kontrolü (girilmişse)
  if (imei1 && !/^\d{15}$/.test(imei1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["imei1"],
      message: "IMEI tam olarak 15 haneli rakamlardan oluşmalıdır",
    })
  }

  // Çift SIM ise IMEI 2 opsiyonel (girilmişse format kontrolü yapılır)
  // IMEI 2 format kontrolü (girilmişse)
  if (imei2 && !/^\d{15}$/.test(imei2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["imei2"],
      message: "İkinci IMEI tam olarak 15 haneli rakamlardan oluşmalıdır",
    })
  }

  // IMEI 1 ve 2 farklı olmalı
  if (imei1 && imei2 && imei1 === imei2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["imei2"],
      message: "İkinci IMEI birinci IMEI'den farklı olmalıdır",
    })
  }
}

// ─── addDevice Schema ─────────────────────────────────────────────────────────

const addDeviceSchema = z
  .object({
    brand_id: z.string().min(1, "Marka seçimi zorunludur"),
    model_id: z.string().min(1, "Model seçimi zorunludur"),
    color: z.string().min(1, "Renk zorunludur"),
    storage: z.string().min(1, "Hafıza zorunludur"),
    purchase_price: z
      .string()
      .min(1, "Alış fiyatı zorunludur")
      .transform((v) => parseFloat(v))
      .refine((v) => !isNaN(v) && v > 0, "Geçerli bir alış fiyatı girin"),
    display_price: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== "" ? parseFloat(v) : null))
      .refine((v) => v === null || (!isNaN(v) && v > 0), "Geçerli bir vitrin fiyatı girin"),
    imei1: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
    imei2: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
    is_dual_sim: z.boolean().default(false),
    is_new: z.boolean().default(true),
    is_foreign: z.boolean().default(false),
    has_box: z.boolean().default(true),
    has_invoice: z.boolean().default(false),
    warranty_months: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== "" ? parseInt(v, 10) : 0))
      .refine((v) => !isNaN(v) && v >= 0, "Geçerli bir garanti süresi girin"),
    barcode: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
    battery_health: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== "" ? parseInt(v, 10) : null))
      .refine((v) => v === null || (!isNaN(v) && v >= 0 && v <= 100), "Pil durumu 0-100 arasında olmalıdır"),
    supplier_id: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  })
  .superRefine((data, ctx) => {
    validateImeis(data.imei1 ?? null, data.imei2 ?? null, data.is_dual_sim, ctx)
  })

const updateDeviceSchema = z
  .object({
    color: z.string().min(1, "Renk zorunludur"),
    storage: z.string().min(1, "Hafıza zorunludur"),
    purchase_price: z
      .string()
      .min(1, "Alış fiyatı zorunludur")
      .transform((v) => parseFloat(v))
      .refine((v) => !isNaN(v) && v > 0, "Geçerli bir alış fiyatı girin"),
    recommended_sale_price: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== "" ? parseFloat(v) : null))
      .refine((v) => v === null || (!isNaN(v) && v > 0), "Geçerli bir vitrin fiyatı girin"),
    imei_1: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
    imei_2: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
    is_dual_sim: z.boolean().default(false),
    is_new: z.boolean().default(false),
    is_foreign: z.boolean().default(false),
    has_box: z.boolean().default(false),
    has_invoice: z.boolean().default(false),
    warranty_months: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== "" ? parseInt(v, 10) : 0))
      .refine((v) => !isNaN(v) && v >= 0, "Geçerli bir garanti süresi girin"),
    barcode: z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
    battery_health: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== "" ? parseInt(v, 10) : null))
      .refine((v) => v === null || (!isNaN(v) && v >= 0 && v <= 100), "Pil durumu 0-100 arasında olmalıdır"),
  })
  .superRefine((data, ctx) => {
    validateImeis(data.imei_1 ?? null, data.imei_2 ?? null, data.is_dual_sim, ctx)
  })

// ─── addDevice ───────────────────────────────────────────────────────────────

export async function addDevice(formData: FormData): Promise<ActionResult> {
  const raw = {
    brand_id: formData.get("brand_id") as string,
    model_id: formData.get("model_id") as string,
    color: (formData.get("color") as string) ?? "",
    storage: (formData.get("storage") as string) ?? "",
    purchase_price: formData.get("purchase_price") as string,
    display_price: (formData.get("recommended_sale_price") as string) ?? "",
    imei1: (formData.get("imei_1") as string) ?? "",
    imei2: (formData.get("imei_2") as string) ?? "",
    is_dual_sim: formData.get("is_dual_sim") === "true",
    is_new: formData.get("is_new") === "true",
    is_foreign: formData.get("is_foreign") === "true",
    has_box: formData.get("has_box") === "true",
    has_invoice: formData.get("has_invoice") === "true",
    warranty_months: (formData.get("warranty_months") as string) ?? "",
    barcode: (formData.get("barcode") as string) ?? "",
    battery_health: (formData.get("battery_health") as string) ?? "",
    supplier_id: (formData.get("supplier_id") as string) ?? "",
  }

  const parsed = addDeviceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const {
    model_id,
    color,
    storage,
    purchase_price,
    display_price,
    imei1,
    imei2,
    is_dual_sim,
    is_new,
    is_foreign,
    has_box,
    has_invoice,
    barcode,
    supplier_id,
  } = parsed.data

  // Sıfır cihazda garanti otomatik 24 ay
  let warranty_months = parsed.data.warranty_months
  if (is_new && warranty_months === 0) {
    warranty_months = 24
  }

  // Sıfır cihazda pil durumu otomatik 100
  const battery_health = is_new ? 100 : (parsed.data.battery_health ?? null)

  const supabase = await createClient()

  // Find or create model_variant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingVariant } = await (supabase.from("model_variants") as any)
    .select("id")
    .eq("model_id", model_id)
    .eq("color", color)
    .eq("storage", storage)
    .maybeSingle()

  let variantId: string

  if (existingVariant) {
    variantId = existingVariant.id
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newVariant, error: variantError } = await (supabase.from("model_variants") as any)
      .insert({ model_id, color, storage })
      .select("id")
      .single()

    if (variantError || !newVariant) {
      return { error: "Model varyantı oluşturulurken bir hata oluştu." }
    }
    variantId = newVariant.id
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("devices") as any).insert({
    variant_id: variantId,
    supplier_id: supplier_id ?? null,
    purchase_price,
    recommended_sale_price: display_price,
    imei_1: imei1,
    imei_2: is_dual_sim ? imei2 : null,  // Tek SIM ise her zaman null
    is_dual_sim,
    is_new,
    is_foreign,
    has_box,
    has_invoice,
    warranty_months,
    barcode: barcode ?? generateDeviceBarcode(),
    battery_health,
    status: "IN_STOCK",
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "Bu IMEI numarası zaten kayıtlı." }
    }
    return { error: "Cihaz eklenirken bir hata oluştu." }
  }

  revalidatePath("/devices")
  return { success: true }
}

// ─── updateDevice ─────────────────────────────────────────────────────────────

export async function updateDevice(
  deviceId: string,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    color: (formData.get("color") as string) ?? "",
    storage: (formData.get("storage") as string) ?? "",
    purchase_price: formData.get("purchase_price") as string,
    recommended_sale_price: (formData.get("recommended_sale_price") as string) ?? "",
    imei_1: (formData.get("imei_1") as string) ?? "",
    imei_2: (formData.get("imei_2") as string) ?? "",
    is_dual_sim: formData.get("is_dual_sim") === "true",
    is_new: formData.get("is_new") === "true",
    is_foreign: formData.get("is_foreign") === "true",
    has_box: formData.get("has_box") === "true",
    has_invoice: formData.get("has_invoice") === "true",
    warranty_months: (formData.get("warranty_months") as string) ?? "",
    barcode: (formData.get("barcode") as string) ?? "",
    battery_health: (formData.get("battery_health") as string) ?? "",
  }

  const parsed = updateDeviceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Sıfır cihazda garanti otomatik 24 ay
  let warranty_months = parsed.data.warranty_months
  if (parsed.data.is_new && warranty_months === 0) {
    warranty_months = 24
  }

  // Sıfır cihazda pil durumu otomatik 100
  const battery_health = parsed.data.is_new ? 100 : (parsed.data.battery_health ?? null)

  const supabase = await createClient()

  // Renk/hafıza değiştiyse variant güncelle veya yeni oluştur
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentDevice } = await (supabase as any)
    .from("devices")
    .select("variant_id, model_variants:variant_id(model_id, color, storage)")
    .eq("id", deviceId)
    .single()

  if (currentDevice?.model_variants) {
    const { model_id, color: currentColor, storage: currentStorage } = currentDevice.model_variants
    if (parsed.data.color !== currentColor || parsed.data.storage !== currentStorage) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingVariant } = await (supabase as any)
        .from("model_variants")
        .select("id")
        .eq("model_id", model_id)
        .eq("color", parsed.data.color)
        .eq("storage", parsed.data.storage)
        .maybeSingle()

      let newVariantId: string
      if (existingVariant) {
        newVariantId = existingVariant.id
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newVariant, error: variantError } = await (supabase as any)
          .from("model_variants")
          .insert({ model_id, color: parsed.data.color, storage: parsed.data.storage })
          .select("id")
          .single()
        if (variantError || !newVariant) {
          return { error: "Varyant oluşturulurken bir hata oluştu." }
        }
        newVariantId = newVariant.id
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("devices").update({ variant_id: newVariantId }).eq("id", deviceId)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("devices") as any)
    .update({
      purchase_price: parsed.data.purchase_price,
      recommended_sale_price: parsed.data.recommended_sale_price,
      imei_1: parsed.data.imei_1,
      imei_2: parsed.data.is_dual_sim ? parsed.data.imei_2 : null,
      is_dual_sim: parsed.data.is_dual_sim,
      is_new: parsed.data.is_new,
      is_foreign: parsed.data.is_foreign,
      has_box: parsed.data.has_box,
      has_invoice: parsed.data.has_invoice,
      warranty_months,
      barcode: parsed.data.barcode,
      battery_health,
    })
    .eq("id", deviceId)

  if (error) {
    if (error.code === "23505") {
      return { error: "Bu IMEI numarası zaten kayıtlı." }
    }
    return { error: "Cihaz güncellenirken bir hata oluştu." }
  }

  revalidatePath("/devices")
  revalidatePath("/devices/" + deviceId)
  return { success: true }
}

// ─── updateDevicePrice ────────────────────────────────────────────────────────

export async function updateDevicePrice(
  deviceId: string,
  formData: FormData
): Promise<ActionResult> {
  const raw = formData.get("new_price") as string
  const newPrice = parseFloat(raw)

  if (!raw || isNaN(newPrice) || newPrice <= 0) {
    return { error: "Geçerli bir fiyat girin (0'dan büyük olmalıdır)." }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("devices") as any)
    .update({ recommended_sale_price: newPrice })
    .eq("id", deviceId)

  if (error) {
    return { error: "Fiyat güncellenirken bir hata oluştu." }
  }

  revalidatePath("/devices")
  revalidatePath("/devices/" + deviceId)
  return { success: true }
}

// ─── addDeviceExpense ─────────────────────────────────────────────────────────

export async function addDeviceExpense(
  deviceId: string,
  formData: FormData
): Promise<ActionResult> {
  const expenseName = (formData.get("expense_name") as string)?.trim()
  const raw = formData.get("amount") as string
  const amount = parseFloat(raw)

  if (!expenseName) {
    return { error: "Masraf adı zorunludur." }
  }
  if (!raw || isNaN(amount) || amount <= 0) {
    return { error: "Geçerli bir tutar girin (0'dan büyük olmalıdır)." }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("device_expenses") as any).insert({
    device_id: deviceId,
    expense_name: expenseName,
    amount,
    expense_date: new Date().toISOString().split("T")[0],
  })

  if (error) {
    return { error: "Masraf eklenirken bir hata oluştu." }
  }

  revalidatePath("/devices/" + deviceId)
  return { success: true }
}

// ─── deleteDevice ─────────────────────────────────────────────────────────────

export async function deleteDevice(deviceId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Sadece stokta olan cihazlar silinebilir
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: device, error: fetchError } = await (supabase as any)
    .from("devices")
    .select("status")
    .eq("id", deviceId)
    .single()

  if (fetchError || !device) {
    return { error: "Cihaz bulunamadı." }
  }

  if (device.status !== "IN_STOCK") {
    return { error: "Sadece stokta olan cihazlar silinebilir." }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("devices")
    .delete()
    .eq("id", deviceId)

  if (error) {
    return { error: "Cihaz silinirken bir hata oluştu." }
  }

  revalidatePath("/devices")
  return { success: true }
}
