import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code || code.trim() === "") {
    return NextResponse.json({ error: "Barkod gerekli" }, { status: 400 })
  }

  const supabase = await createClient()

  // Önce cihazlarda ara (v_in_stock_devices view'ından — stokta olanlar)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deviceData } = await (supabase as any)
    .from("v_in_stock_devices")
    .select("*")
    .eq("barcode", code.trim())
    .maybeSingle()

  if (deviceData) {
    return NextResponse.json({
      type: "device",
      data: {
        device_id: deviceData.device_id,
        barcode: code.trim(),
        brand: deviceData.brand,
        model: deviceData.model,
        color: deviceData.color,
        storage: deviceData.storage,
        imei_1: deviceData.imei_1,
        imei_2: deviceData.imei_2,
        is_new: deviceData.is_new,
        is_foreign: deviceData.is_foreign,
        is_dual_sim: deviceData.is_dual_sim,
        has_box: deviceData.has_box,
        has_invoice: deviceData.has_invoice,
        warranty_months: deviceData.warranty_months,
        battery_health: deviceData.battery_health,
        status: deviceData.status,
        purchase_price: deviceData.purchase_price,
        total_expenses: deviceData.total_expenses,
        net_cost_to_us: deviceData.net_cost_to_us,
        recommended_sale_price: deviceData.recommended_sale_price,
      },
    })
  }

  // Aksesuarlarda ara
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accessoryData } = await (supabase as any)
    .from("accessories")
    .select("*")
    .eq("barcode", code.trim())
    .maybeSingle()

  if (accessoryData) {
    return NextResponse.json({
      type: "accessory",
      data: {
        id: accessoryData.id,
        barcode: accessoryData.barcode,
        brand: accessoryData.brand,
        category: accessoryData.category,
        purchase_price: accessoryData.purchase_price,
        sale_price: accessoryData.sale_price,
        stock_quantity: accessoryData.stock_quantity,
      },
    })
  }

  return NextResponse.json({ error: "Barkod bulunamadı" }, { status: 404 })
}
