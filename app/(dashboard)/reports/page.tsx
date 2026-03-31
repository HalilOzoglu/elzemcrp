import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { ReportsClient } from "./reports-client"
import ReportsLoading from "./loading"
import type { MonthlySalesProfit, LowStockAccessory } from "@/lib/supabase/types"

interface ReportsPageProps {
  searchParams: Promise<{
    from?: string
    to?: string
  }>
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return monday.toISOString().split("T")[0]
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { from, to } = await searchParams
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]
  const weekStart = getWeekStart()

  // Build monthly sales query with optional date range filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let monthlySalesQuery = (supabase as any)
    .from("v_monthly_sales_profit")
    .select("*")
    .order("sale_month", { ascending: false })

  if (from) {
    monthlySalesQuery = monthlySalesQuery.gte("sale_month", from.slice(0, 7))
  }
  if (to) {
    monthlySalesQuery = monthlySalesQuery.lte("sale_month", to.slice(0, 7))
  }

  const [
    monthlySalesResult,
    inStockResult,
    lowStockResult,
    todaySalesResult,
    weeklySalesResult,
  ] = await Promise.all([
    monthlySalesQuery,
    supabase.from("v_in_stock_devices").select("purchase_price, recommended_sale_price"),
    supabase.from("v_low_stock_accessories").select("*"),
    supabase
      .from("sales")
      .select("sale_price")
      .eq("sale_date", today) as unknown as Promise<{ data: { sale_price: number }[] | null }>,
    supabase
      .from("sales")
      .select("sale_price")
      .gte("sale_date", weekStart)
      .lte("sale_date", today) as unknown as Promise<{ data: { sale_price: number }[] | null }>,
  ])

  const monthlySales: MonthlySalesProfit[] = monthlySalesResult.data ?? []

  const inStockRows = inStockResult.data ?? []
  const totalPurchaseCost = inStockRows.reduce(
    (sum: number, row: { purchase_price: number }) => sum + (row.purchase_price ?? 0),
    0
  )
  const totalDisplayPrice = inStockRows.reduce(
    (sum: number, row: { recommended_sale_price: number | null }) =>
      sum + (row.recommended_sale_price ?? 0),
    0
  )

  const lowStockAccessories: LowStockAccessory[] = lowStockResult.data ?? []

  const todayRows = (todaySalesResult as { data: { sale_price: number }[] | null }).data ?? []
  const todaySalesTotal = todayRows.reduce((sum, s) => sum + (s.sale_price ?? 0), 0)
  const todaySalesCount = todayRows.length

  const weeklyRows = (weeklySalesResult as { data: { sale_price: number }[] | null }).data ?? []
  const weeklySalesTotal = weeklyRows.reduce((sum, s) => sum + (s.sale_price ?? 0), 0)
  const weeklySalesCount = weeklyRows.length

  return (
    <Suspense fallback={<ReportsLoading />}>
      <ReportsClient
        monthlySales={monthlySales}
        stockValue={{ totalPurchaseCost, totalDisplayPrice }}
        lowStockAccessories={lowStockAccessories}
        activeFrom={from ?? ""}
        activeTo={to ?? ""}
        todaySalesTotal={todaySalesTotal}
        todaySalesCount={todaySalesCount}
        weeklySalesTotal={weeklySalesTotal}
        weeklySalesCount={weeklySalesCount}
      />
    </Suspense>
  )
}
