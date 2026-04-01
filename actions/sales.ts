"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { PaymentMethod, InvoiceType } from "@/lib/supabase/types"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SellDeviceSummary = {
  device_id: string
  sale_price: number
  payment_method: PaymentMethod | null
  invoice_type: InvoiceType | null
}

export type SellDeviceResult =
  | { success: true; summary: SellDeviceSummary }
  | { error: string }

export type SellAccessorySummary = {
  accessory_barcode: string
  quantity: number
  sale_price: number
}

export type SellAccessoryResult =
  | { success: true; summary: SellAccessorySummary }
  | { error: string }

// ─── sellDevice ───────────────────────────────────────────────────────────────
// RPC: sell_device(p_device_id, p_customer_id, p_sale_price, p_payment_method, p_invoice_type)

const sellDeviceSchema = z.object({
  device_id: z.string().min(1, "Cihaz seçimi zorunludur"),
  sale_price: z
    .string()
    .min(1, "Satış fiyatı zorunludur")
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v > 0, "Satış fiyatı 0'dan büyük olmalıdır"),
  customer_id: z.string().optional().nullable(),
  payment_method: z.enum(["CASH", "CREDIT_CARD", "IBAN"]).optional().nullable(),
  invoice_type: z.enum(["AF", "MF"]).optional().nullable(),
})

export async function sellDevice(formData: FormData): Promise<SellDeviceResult> {
  const raw = {
    device_id: formData.get("device_id") as string,
    sale_price: formData.get("sale_price") as string,
    customer_id: (formData.get("contact_id") as string) || null,
    payment_method: (formData.get("payment_method") as string) || null,
    invoice_type: (formData.get("invoice_type") as string) || null,
  }

  const parsed = sellDeviceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { device_id, sale_price, customer_id, payment_method, invoice_type } = parsed.data

  const supabase = await createClient()

  // Stok kontrolü
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: device, error: deviceError } = await (supabase as any)
    .from("devices")
    .select("status")
    .eq("id", device_id)
    .single()

  if (deviceError || !device) {
    return { error: "Cihaz bulunamadı." }
  }

  if (device.status !== "IN_STOCK") {
    return { error: "Bu cihaz stokta değil, satış yapılamaz." }
  }

  // RPC çağrısı — gerçek parametre adları: p_device_id, p_customer_id, p_sale_price, p_payment_method, p_invoice_type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase as any).rpc("sell_device", {
    p_device_id: device_id,
    p_customer_id: customer_id ?? null,
    p_sale_price: sale_price,
    p_payment_method: payment_method ?? null,
    p_invoice_type: invoice_type ?? null,
  })

  if (rpcError) {
    return { error: rpcError.message ?? "Satış işlemi sırasında bir hata oluştu." }
  }

  revalidatePath("/sales")
  revalidatePath("/devices")

  return {
    success: true,
    summary: {
      device_id,
      sale_price,
      payment_method: (payment_method as PaymentMethod) ?? null,
      invoice_type: (invoice_type as InvoiceType) ?? null,
    },
  }
}

// ─── sellAccessory ────────────────────────────────────────────────────────────
// RPC: sell_accessory(p_accessory_barcode, p_quantity) — sadece stoktan düşer, satış kaydı oluşturmaz

const sellAccessorySchema = z.object({
  accessory_barcode: z.string().min(1, "Aksesuar seçimi zorunludur"),
  quantity: z
    .string()
    .min(1, "Adet zorunludur")
    .transform((v) => parseInt(v, 10))
    .refine((v) => !isNaN(v) && v >= 1, "Adet en az 1 olmalıdır"),
})

export async function sellAccessory(formData: FormData): Promise<SellAccessoryResult> {
  const raw = {
    accessory_barcode: formData.get("accessory_barcode") as string,
    quantity: formData.get("quantity") as string,
  }

  const parsed = sellAccessorySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { accessory_barcode, quantity } = parsed.data

  const supabase = await createClient()

  // Stok ve fiyat bilgisi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accessory, error: accessoryError } = await (supabase as any)
    .from("accessories")
    .select("barcode, sale_price, stock_quantity")
    .eq("barcode", accessory_barcode)
    .single()

  if (accessoryError || !accessory) {
    return { error: "Aksesuar bulunamadı." }
  }

  if (accessory.stock_quantity < quantity) {
    return { error: `Yetersiz stok. Mevcut stok: ${accessory.stock_quantity} adet.` }
  }

  // RPC çağrısı — p_accessory_barcode, p_quantity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase as any).rpc("sell_accessory", {
    p_accessory_barcode: accessory_barcode,
    p_quantity: quantity,
  })

  if (rpcError) {
    return { error: rpcError.message ?? "Satış işlemi sırasında bir hata oluştu." }
  }

  revalidatePath("/accessories")

  return {
    success: true,
    summary: {
      accessory_barcode,
      quantity,
      sale_price: accessory.sale_price,
    },
  }
}

// ─── updateAfStatus ───────────────────────────────────────────────────────────

export type ActionResult = { success: true } | { error: string }

export async function updateAfStatus(
  saleId: string,
  status: "PENDING" | "ISSUED"
): Promise<ActionResult> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("sales")
    .update({ af_status: status })
    .eq("id", saleId)

  if (error) {
    return { error: error.message ?? "AF durumu güncellenirken hata oluştu." }
  }

  revalidatePath("/sales")
  revalidatePath("/")

  return { success: true }
}

// ─── deleteSale ───────────────────────────────────────────────────────────────

export async function deleteSale(saleId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Satışa bağlı cihazı bul
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sale, error: fetchError } = await (supabase as any)
    .from("sales")
    .select("id, device_id")
    .eq("id", saleId)
    .single()

  if (fetchError || !sale) {
    return { error: "Satış bulunamadı." }
  }

  // Satışı sil
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from("sales")
    .delete()
    .eq("id", saleId)

  if (deleteError) {
    return { error: "Satış silinirken bir hata oluştu." }
  }

  // Cihaz varsa stoka geri al
  if (sale.device_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("devices")
      .update({ status: "IN_STOCK" })
      .eq("id", sale.device_id)
  }

  revalidatePath("/sales")
  revalidatePath("/devices")
  revalidatePath("/")

  return { success: true }
}

// ─── updateSale ───────────────────────────────────────────────────────────────

export async function updateSale(saleId: string, formData: FormData): Promise<ActionResult> {
  const payment_method = (formData.get("payment_method") as string) || null
  const invoice_type = (formData.get("invoice_type") as string) || null
  const customer_id = (formData.get("contact_id") as string) || null
  const sale_price_raw = formData.get("sale_price") as string
  const sale_price = parseFloat(sale_price_raw)

  if (!sale_price_raw || isNaN(sale_price) || sale_price <= 0) {
    return { error: "Geçerli bir satış fiyatı girin." }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("sales")
    .update({
      sale_price,
      payment_method: payment_method || null,
      invoice_type: invoice_type || null,
      customer_id: customer_id || null,
      // AF seçilince bekliyor, diğer durumlarda null
      af_status: invoice_type === "AF" ? "PENDING" : null,
    })
    .eq("id", saleId)

  if (error) {
    return { error: "Satış güncellenirken bir hata oluştu." }
  }

  revalidatePath("/sales")
  revalidatePath("/sales/" + saleId)
  revalidatePath("/")
  return { success: true }
}
