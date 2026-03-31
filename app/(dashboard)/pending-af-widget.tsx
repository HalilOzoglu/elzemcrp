"use client"

import { useOptimistic, useTransition } from "react"
import Link from "next/link"
import { updateAfStatus } from "@/actions/sales"

interface AfItem {
  id: string
  sale_date: string
  sale_price: number
  product_name: string
}

interface PendingAfWidgetProps {
  items: AfItem[]
  count: number
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatCurrency(value: number): string {
  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  })
}

export function PendingAfWidget({ items, count }: PendingAfWidgetProps) {
  const [, startTransition] = useTransition()

  const [optimisticItems, removeItem] = useOptimistic(
    items,
    (state: AfItem[], removedId: string) => state.filter((item) => item.id !== removedId)
  )

  async function handleIssued(id: string) {
    startTransition(() => {
      removeItem(id)
    })
    await updateAfStatus(id, "ISSUED")
  }

  if (count === 0 && optimisticItems.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Bekleyen Alış Faturaları</h3>
        <Link href="/sales?invoice=AF&af_status=PENDING">
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:opacity-80 transition-opacity">
            {count} bekleyen
          </span>
        </Link>
      </div>

      {optimisticItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tüm faturalar kesildi.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tarih</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ürün</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tutar</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {optimisticItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(item.sale_date)}</td>
                  <td className="px-4 py-2 font-medium">{item.product_name}</td>
                  <td className="px-4 py-2">{formatCurrency(item.sale_price)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleIssued(item.id)}
                      className="rounded-md bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                    >
                      Kesildi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
