import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { PriceEditForm } from "./price-edit-form"
import { ExpenseForm } from "./expense-form"
import { DeviceEditDialog } from "./device-edit-dialog"
import type { Device, ModelVariant, Model, Brand, DeviceExpense, DevicePriceHistory } from "@/lib/supabase/types"

interface DeviceDetailPageProps {
  params: Promise<{ id: string }>
}

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "Stokta",
  SOLD: "Satıldı",
  RETURNED: "İade",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  IN_STOCK: "default",
  SOLD: "secondary",
  RETURNED: "destructive",
}

function formatPrice(price: number | null): string {
  if (price === null) return "—"
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateStr))
}

export default async function DeviceDetailPage({ params }: DeviceDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [deviceResult, totalCostResult, netProfitResult, expensesResult, priceHistoryResult] =
    await Promise.all([
      // Fetch from devices table directly for all fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("devices")
        .select(`
          *,
          variant:model_variants(
            id, color, storage,
            model:models(id, name, brand:brands(id, name))
          ),
          supplier:contacts!supplier_id(id, full_name)
        `)
        .eq("id", id)
        .single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("get_total_device_cost", { p_device_id: id }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("get_device_net_profit", { p_device_id: id }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("device_expenses") as any)
        .select("*").eq("device_id", id).order("created_at", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("device_price_history") as any)
        .select("*").eq("device_id", id).order("changed_at", { ascending: false }),
    ])

  if (!deviceResult.data) notFound()

  const device = deviceResult.data as Device & {
    variant: ModelVariant & { model: Model & { brand: Brand } }
    supplier: { id: string; full_name: string } | null
  }
  const totalCost: number = totalCostResult.data ?? 0
  const netProfit: number = netProfitResult.data ?? 0
  const expenses: DeviceExpense[] = expensesResult.data ?? []
  const priceHistory: DevicePriceHistory[] = priceHistoryResult.data ?? []

  const brand = device.variant?.model?.brand?.name ?? "—"
  const model = device.variant?.model?.name ?? "—"
  const color = device.variant?.color ?? "—"
  const storage = device.variant?.storage ?? "—"

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Back link */}
      <div>
        <Link href="/devices" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Geri
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{brand} {model}</h2>
          <p className="text-muted-foreground text-sm mt-1">{color} / {storage}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANTS[device.status] ?? "outline"}>
            {STATUS_LABELS[device.status] ?? device.status}
          </Badge>
          <DeviceEditDialog
            deviceId={id}
            device={{
              color,
              storage,
              purchase_price: device.purchase_price,
              recommended_sale_price: device.recommended_sale_price,
              imei_1: device.imei_1,
              imei_2: device.imei_2,
              is_dual_sim: device.is_dual_sim,
              is_new: device.is_new,
              is_foreign: device.is_foreign,
              has_box: device.has_box,
              has_invoice: device.has_invoice,
              warranty_months: device.warranty_months,
              barcode: device.barcode,
              battery_health: device.battery_health ?? null,
            }}
          />
        </div>
      </div>

      {/* Device Info */}
      <section className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Cihaz Bilgileri</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Marka:</span> <span className="font-medium">{brand}</span></div>
          <div><span className="text-muted-foreground">Model:</span> <span className="font-medium">{model}</span></div>
          <div><span className="text-muted-foreground">Renk:</span> <span className="font-medium">{color}</span></div>
          <div><span className="text-muted-foreground">Hafıza:</span> <span className="font-medium">{storage}</span></div>
          <div><span className="text-muted-foreground">IMEI 1:</span> <span className="font-mono font-medium">{device.imei_1 ?? "—"}</span></div>
          <div><span className="text-muted-foreground">IMEI 2:</span> <span className="font-mono font-medium">{device.imei_2 ?? "—"}</span></div>
          <div><span className="text-muted-foreground">Çift SIM:</span> <span className="font-medium">{device.is_dual_sim ? "Evet" : "Hayır"}</span></div>
          <div><span className="text-muted-foreground">Sıfır/Yabancı:</span> <span className="font-medium">{device.is_new ? "Sıfır" : "İkinci El"} / {device.is_foreign ? "Yabancı" : "Yerli"}</span></div>
          <div><span className="text-muted-foreground">Kutu:</span> <span className="font-medium">{device.has_box ? "Var" : "Yok"}</span></div>
          <div><span className="text-muted-foreground">Fatura:</span> <span className="font-medium">{device.has_invoice ? "Var" : "Yok"}</span></div>
          <div><span className="text-muted-foreground">Garanti:</span> <span className="font-medium">{device.warranty_months} ay</span></div>
          <div><span className="text-muted-foreground">Barkod:</span> <span className="font-mono font-medium">{device.barcode ?? "—"}</span></div>
          <div><span className="text-muted-foreground">Pil Durumu:</span> <span className="font-medium">{device.battery_health != null ? `${device.battery_health}%` : "—"}</span></div>
          <div><span className="text-muted-foreground">Durum:</span> <span className="font-medium">{STATUS_LABELS[device.status] ?? device.status}</span></div>
          <div><span className="text-muted-foreground">Tedarikçi:</span> <span className="font-medium">{device.supplier?.full_name ?? "Perakende"}</span></div>
        </div>
      </section>

      {/* Cost / Profit */}
      <section className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Maliyet &amp; Kar</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Alış Fiyatı</p>
            <p className="text-lg font-semibold">{formatPrice(device.purchase_price)}</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Toplam Masraf</p>
            <p className="text-lg font-semibold">{formatPrice(totalCost - device.purchase_price)}</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
            <p className="text-lg font-semibold">{formatPrice(totalCost)}</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Net Kar</p>
            <p className={`text-lg font-semibold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatPrice(netProfit)}
            </p>
          </div>
        </div>
      </section>

      {/* Display Price */}
      <section className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Vitrin Fiyatı</h3>
        <PriceEditForm deviceId={id} currentPrice={device.recommended_sale_price} />
      </section>

      {/* Expenses */}
      <section className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Masraflar</h3>
        <ExpenseForm deviceId={id} />
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz masraf eklenmemiş.</p>
        ) : (
          <div className="rounded-md border divide-y text-sm">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-medium">{expense.expense_name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{formatDate(expense.created_at)}</span>
                </div>
                <span className="font-semibold">{formatPrice(expense.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Price History */}
      <section className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Fiyat Geçmişi</h3>
        {priceHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz fiyat değişikliği yok.</p>
        ) : (
          <div className="rounded-md border divide-y text-sm">
            {priceHistory.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground line-through">{formatPrice(entry.old_recommended_price)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold">{formatPrice(entry.new_recommended_price)}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(entry.changed_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
