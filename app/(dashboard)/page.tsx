import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import type { MonthlySalesProfit, LowStockAccessory } from "@/lib/supabase/types"
import { PendingAfWidget } from "./pending-af-widget"

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return monday.toISOString().split("T")[0]
}

function formatCurrency(value: number): string {
  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  IBAN: "IBAN",
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]
  const weekStart = getWeekStart()

  const [
    { count: deviceCount },
    todaySalesResult,
    weeklySalesResult,
    { data: monthlyProfit },
    { data: lowStock },
    stockSummaryResult,
    recentSalesResult,
    pendingAfCountResult,
    pendingAfListResult,
  ] = await Promise.all([
    supabase
      .from("v_in_stock_devices")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("sales")
      .select("sale_price")
      .eq("sale_date", today) as unknown as Promise<{ data: { sale_price: number }[] | null }>,

    supabase
      .from("sales")
      .select("sale_price")
      .gte("sale_date", weekStart)
      .lte("sale_date", today) as unknown as Promise<{ data: { sale_price: number }[] | null }>,

    supabase
      .from("v_monthly_sales_profit")
      .select("*")
      .order("sale_month", { ascending: false })
      .limit(1),

    supabase.from("v_low_stock_accessories").select("*"),

    // Stok özeti
    supabase
      .from("v_in_stock_devices")
      .select("purchase_price, recommended_sale_price, is_new, is_foreign") as unknown as Promise<{
        data: {
          purchase_price: number
          recommended_sale_price: number | null
          is_new: boolean
          is_foreign: boolean
        }[] | null
      }>,

    // Son 5 satış
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("sales")
      .select(
        `id, sale_date, sale_price, payment_method,
         devices:device_id (
           model_variants:variant_id (
             color, storage,
             models:model_id ( name, brands:brand_id ( name ) )
           )
         )`
      )
      .order("sale_date", { ascending: false })
      .limit(5),

    // Bekleyen AF sayısı
    supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .eq("invoice_type", "AF")
      .eq("af_status", "PENDING"),

    // Bekleyen AF listesi (max 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("sales")
      .select(
        `id, sale_date, sale_price, af_status,
         devices:device_id (
           model_variants:variant_id (
             color, storage,
             models:model_id ( name, brands:brand_id ( name ) )
           )
         )`
      )
      .eq("invoice_type", "AF")
      .eq("af_status", "PENDING")
      .order("sale_date", { ascending: false })
      .limit(10),
  ])

  const todayTotal = ((todaySalesResult as { data: { sale_price: number }[] | null }).data ?? []).reduce(
    (sum, s) => sum + (s.sale_price ?? 0),
    0
  )

  const weeklyTotal = ((weeklySalesResult as { data: { sale_price: number }[] | null }).data ?? []).reduce(
    (sum, s) => sum + (s.sale_price ?? 0),
    0
  )

  const currentMonthProfit = (monthlyProfit as MonthlySalesProfit[] | null)?.[0]
  const lowStockItems = (lowStock as LowStockAccessory[] | null) ?? []

  // Stok özeti hesapla
  const stockItems = stockSummaryResult.data ?? []
  const totalStockCost = stockItems.reduce((sum, d) => sum + (d.purchase_price ?? 0), 0)
  const totalShowroomValue = stockItems.reduce((sum, d) => sum + (d.recommended_sale_price ?? 0), 0)
  const newDeviceCount = stockItems.filter((d) => d.is_new).length
  const usedDeviceCount = stockItems.filter((d) => !d.is_new).length
  const foreignDeviceCount = stockItems.filter((d) => d.is_foreign).length

  // Son satışlar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentSales = ((recentSalesResult.data ?? []) as any[]).map((row: any) => {
    const brand = row.devices?.model_variants?.models?.brands?.name ?? ""
    const model = row.devices?.model_variants?.models?.name ?? ""
    const color = row.devices?.model_variants?.color ?? ""
    const storage = row.devices?.model_variants?.storage ?? ""
    const productName = [brand, model, color, storage].filter(Boolean).join(" ") || "Cihaz"
    return {
      id: row.id as string,
      sale_date: row.sale_date as string,
      sale_price: row.sale_price as number,
      payment_method: row.payment_method as string | null,
      product_name: productName,
    }
  })

  const pendingAfCount = pendingAfCountResult.count ?? 0

  // Bekleyen AF listesi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingAfItems = ((pendingAfListResult.data ?? []) as any[]).map((row: any) => {
    const brand = row.devices?.model_variants?.models?.brands?.name ?? ""
    const model = row.devices?.model_variants?.models?.name ?? ""
    const color = row.devices?.model_variants?.color ?? ""
    const storage = row.devices?.model_variants?.storage ?? ""
    const productName = [brand, model, color, storage].filter(Boolean).join(" ") || "Cihaz"
    return {
      id: row.id as string,
      sale_date: row.sale_date as string,
      sale_price: row.sale_price as number,
      product_name: productName,
    }
  })

  function accessoryDisplayName(item: LowStockAccessory): string {
    return [item.brand, item.category].filter(Boolean).join(" / ") || item.barcode
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/devices">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent/50">
            <p className="text-sm text-muted-foreground">Stoktaki Cihazlar</p>
            <p className="mt-1 text-3xl font-bold">{deviceCount ?? 0}</p>
          </div>
        </Link>

        <Link href="/sales">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent/50">
            <p className="text-sm text-muted-foreground">Bugünkü Satış</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(todayTotal)}</p>
          </div>
        </Link>

        <Link href="/sales">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent/50">
            <p className="text-sm text-muted-foreground">Bu Haftaki Satış</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(weeklyTotal)}</p>
          </div>
        </Link>

        <Link href="/reports">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent/50">
            <p className="text-sm text-muted-foreground">Bu Ayki Net Kar</p>
            <p className="mt-1 text-3xl font-bold">
              {currentMonthProfit ? formatCurrency(currentMonthProfit.net_profit) : "—"}
            </p>
          </div>
        </Link>
      </div>

      {/* Stok Özeti */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Stok Özeti</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Toplam Stok Maliyeti</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(totalStockCost)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Toplam Vitrin Değeri</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(totalShowroomValue)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Sıfır / İkinci El</p>
            <p className="mt-1 text-xl font-bold">
              <span className="text-green-600 dark:text-green-400">{newDeviceCount}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span>{usedDeviceCount}</span>
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Yabancı Menşei</p>
            <p className="mt-1 text-xl font-bold">{foreignDeviceCount}</p>
          </div>
        </div>
      </div>

      {/* Son Satışlar */}
      {recentSales.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Son Satışlar</h3>
          <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tarih</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ürün</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tutar</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ödeme</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">
                      <Link href={`/sales/${sale.id}`} className="block hover:underline">{formatDate(sale.sale_date)}</Link>
                    </td>
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/sales/${sale.id}`} className="block hover:underline">{sale.product_name}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/sales/${sale.id}`} className="block hover:underline">{formatCurrency(sale.sale_price)}</Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      <Link href={`/sales/${sale.id}`} className="block hover:underline">
                        {sale.payment_method ? PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method : "—"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bekleyen AF Widget */}
      <PendingAfWidget items={pendingAfItems} count={pendingAfCount} />

      {/* Low stock warnings */}
      {lowStockItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Düşük Stok Uyarıları ({lowStockItems.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockItems.map((item) => (
              <Link key={item.barcode} href="/accessories">
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{accessoryDisplayName(item)}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.stock_quantity === 0
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {item.stock_quantity} adet
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Barkod: {item.barcode}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
