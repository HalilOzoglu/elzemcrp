"use client"

import { useRouter } from "next/navigation"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { MonthlySalesProfit, LowStockAccessory } from "@/lib/supabase/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockValueSummary {
  totalPurchaseCost: number
  totalDisplayPrice: number
}

interface ReportsClientProps {
  monthlySales: MonthlySalesProfit[]
  stockValue: StockValueSummary
  lowStockAccessories: LowStockAccessory[]
  activeFrom: string
  activeTo: string
  todaySalesTotal: number
  todaySalesCount: number
  weeklySalesTotal: number
  weeklySalesCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value)
}

function accessoryDisplayName(acc: LowStockAccessory): string {
  return [acc.brand, acc.category].filter(Boolean).join(" / ") || acc.barcode
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportsClient({
  monthlySales,
  stockValue,
  lowStockAccessories,
  activeFrom,
  activeTo,
  todaySalesTotal,
  todaySalesCount,
  weeklySalesTotal,
  weeklySalesCount,
}: ReportsClientProps) {
  const router = useRouter()

  function handleDateFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const from = (form.elements.namedItem("from") as HTMLInputElement).value
    const to = (form.elements.namedItem("to") as HTMLInputElement).value
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    router.push(`/reports?${params.toString()}`)
  }

  function handleClearFilter() {
    router.push("/reports")
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Raporlar</h2>

      {/* ── Günlük / Haftalık Özet ── */}
      <div>
        <h3 className="mb-3 text-base font-medium">Günlük / Haftalık Özet</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Bugün Satış Tutarı</p>
            <p className="mt-2 text-2xl font-semibold">{formatPrice(todaySalesTotal)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Bugün Satış Adedi</p>
            <p className="mt-2 text-2xl font-semibold">{todaySalesCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Bu Hafta Satış Tutarı</p>
            <p className="mt-2 text-2xl font-semibold">{formatPrice(weeklySalesTotal)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Bu Hafta Satış Adedi</p>
            <p className="mt-2 text-2xl font-semibold">{weeklySalesCount}</p>
          </div>
        </div>
      </div>

      {/* Date range filter */}
      <form onSubmit={handleDateFilter} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-sm text-muted-foreground">
            Başlangıç
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={activeFrom}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-sm text-muted-foreground">
            Bitiş
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={activeTo}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent"
        >
          Filtrele
        </button>
        {(activeFrom || activeTo) && (
          <button
            type="button"
            onClick={handleClearFilter}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Temizle
          </button>
        )}
      </form>

      {/* Monthly sales/profit bar chart */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-medium">Aylık Satış ve Kar Grafiği</h3>
        {monthlySales.length === 0 ? (
          <p className="text-sm text-muted-foreground">Gösterilecek veri yok.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[...monthlySales].reverse()} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sale_month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value) => formatPrice(Number(value))}
                labelFormatter={(label) => `Ay: ${label}`}
              />
              <Legend />
              <Bar dataKey="total_revenue" name="Toplam Gelir" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="net_profit" name="Net Kar" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly data table */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-medium">Aylık Satış Tablosu</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ay</TableHead>
              <TableHead className="text-right">Satış Adedi</TableHead>
              <TableHead className="text-right">Toplam Gelir</TableHead>
              <TableHead className="text-right">Toplam Maliyet</TableHead>
              <TableHead className="text-right">Net Kar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlySales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Gösterilecek veri yok.
                </TableCell>
              </TableRow>
            ) : (
              monthlySales.map((row) => (
                <TableRow key={row.sale_month}>
                  <TableCell className="font-medium">{row.sale_month}</TableCell>
                  <TableCell className="text-right">{row.total_devices_sold}</TableCell>
                  <TableCell className="text-right">{formatPrice(row.total_revenue)}</TableCell>
                  <TableCell className="text-right">{formatPrice(row.total_cost)}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${row.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatPrice(row.net_profit)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stock value summary */}
      <div>
        <h3 className="mb-3 text-base font-medium">Stok Değeri Özeti</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Toplam Alış Maliyeti</p>
            <p className="mt-2 text-2xl font-semibold">{formatPrice(stockValue.totalPurchaseCost)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Toplam Vitrin Fiyatı</p>
            <p className="mt-2 text-2xl font-semibold">{formatPrice(stockValue.totalDisplayPrice)}</p>
          </div>
        </div>
      </div>

      {/* Low stock accessories */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-medium">Kritik Stok Aksesuarları</h3>
        {lowStockAccessories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Kritik stok seviyesinde aksesuar yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marka / Kategori</TableHead>
                <TableHead>Barkod</TableHead>
                <TableHead className="text-right">Stok</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockAccessories.map((acc) => (
                <TableRow key={acc.barcode}>
                  <TableCell className="font-medium">{accessoryDisplayName(acc)}</TableCell>
                  <TableCell className="font-mono text-sm">{acc.barcode}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={acc.stock_quantity === 0 ? "destructive" : "outline"}
                      className={acc.stock_quantity > 0 ? "border-yellow-500 text-yellow-700 bg-yellow-50" : ""}
                    >
                      {acc.stock_quantity}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
