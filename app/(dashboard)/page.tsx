import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import type { MonthlySalesProfit, LowStockAccessory } from "@/lib/supabase/types"

function getWeekStart(): string {
  const now = new Date()
  // ISO week: Monday = 1
  const day = now.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return monday.toISOString().split("T")[0]
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
  const weekStart = getWeekStart()

  const [
    { count: deviceCount },
    todaySalesResult,
    weeklySalesResult,
    { data: monthlyProfit },
    { data: lowStock },
  ] = await Promise.all([
    supabase
      .from("v_in_stock_devices")
      .select("*", { count: "exact", head: true }),

    // Today's sales
    supabase
      .from("sales")
      .select("sale_price")
      .eq("sale_date", today) as unknown as Promise<{ data: { sale_price: number }[] | null }>,

    // This week's sales
    supabase
      .from("sales")
      .select("sale_price")
      .gte("sale_date", weekStart)
      .lte("sale_date", today) as unknown as Promise<{ data: { sale_price: number }[] | null }>,

    // Monthly profit (current month)
    supabase
      .from("v_monthly_sales_profit")
      .select("*")
      .order("sale_month", { ascending: false })
      .limit(1),

    supabase.from("v_low_stock_accessories").select("*"),
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

  function accessoryDisplayName(item: LowStockAccessory): string {
    return [item.brand, item.category].filter(Boolean).join(" / ") || item.barcode
  }

  function formatCurrency(value: number): string {
    return value.toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    })
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
