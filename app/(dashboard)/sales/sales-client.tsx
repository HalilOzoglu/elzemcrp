"use client"

import { useState, useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteSale } from "@/actions/sales"
import type { PaymentMethod, InvoiceType } from "@/lib/supabase/types"
import type { SaleRow } from "./page"

// ─── Label helpers ────────────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  IBAN: "IBAN",
}

const INVOICE_LABELS: Record<InvoiceType, string> = {
  AF: "Alış Faturası",
  MF: "Müşteri Faturası",
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price)
}

function AfStatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const isPending = status === "PENDING"
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        isPending
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      }`}
    >
      {isPending ? "Bekleyen" : "Kesildi"}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalesClientProps {
  sales: SaleRow[]
  activeFrom: string
  activeTo: string
  activePayment: PaymentMethod | null
  activeInvoice: InvoiceType | null
  activeAfStatus: string | null
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function SalesClient({
  sales,
  activeFrom,
  activeTo,
  activePayment,
  activeInvoice,
  activeAfStatus,
}: SalesClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<SaleRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [optimisticSales, dispatchOptimistic] = useOptimistic(
    sales,
    (state: SaleRow[], deletedId: string) => state.filter((s) => s.id !== deletedId)
  )

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    startTransition(() => {
      dispatchOptimistic(deleteTarget.id)
    })
    const result = await deleteSale(deleteTarget.id)
    if ("error" in result) {
      setDeleteError(result.error)
      return
    }
    setDeleteTarget(null)
    router.refresh()
  }

  function buildParams(overrides: Record<string, string | null>) {
    const params = new URLSearchParams()
    const current: Record<string, string | null> = {
      from: activeFrom || null,
      to: activeTo || null,
      payment: activePayment,
      invoice: activeInvoice,
      af_status: activeAfStatus,
    }
    const merged = { ...current, ...overrides }
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    return params.toString()
  }

  function navigate(overrides: Record<string, string | null>) {
    const qs = buildParams(overrides)
    router.push(`/sales${qs ? `?${qs}` : ""}`)
  }

  function handleDateChange(field: "from" | "to", value: string) {
    navigate({ [field]: value || null })
  }

  function togglePayment(method: PaymentMethod) {
    navigate({ payment: activePayment === method ? null : method })
  }

  function toggleInvoice(type: InvoiceType) {
    navigate({ invoice: activeInvoice === type ? null : type })
  }

  function toggleAfStatus(status: string) {
    navigate({ af_status: activeAfStatus === status ? null : status })
  }

  function clearFilters() {
    router.push("/sales")
  }

  const hasFilters = activeFrom || activeTo || activePayment || activeInvoice || activeAfStatus

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Date range */}
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Başlangıç</label>
            <input
              type="date"
              value={activeFrom}
              onChange={(e) => handleDateChange("from", e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Bitiş</label>
            <input
              type="date"
              value={activeTo}
              onChange={(e) => handleDateChange("to", e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Payment method filter */}
        <div className="flex items-center gap-1">
          {(["CASH", "CREDIT_CARD", "IBAN"] as PaymentMethod[]).map((method) => (
            <Button
              key={method}
              size="sm"
              variant={activePayment === method ? "default" : "outline"}
              onClick={() => togglePayment(method)}
            >
              {PAYMENT_LABELS[method]}
            </Button>
          ))}
        </div>

        {/* Invoice type filter */}
        <div className="flex items-center gap-1">
          {(["AF", "MF"] as InvoiceType[]).map((type) => (
            <Button
              key={type}
              size="sm"
              variant={activeInvoice === type ? "default" : "outline"}
              onClick={() => toggleInvoice(type)}
            >
              {INVOICE_LABELS[type]}
            </Button>
          ))}
        </div>

        {/* AF Status filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">AF Durumu:</span>
          {[
            { value: "PENDING", label: "Bekleyen" },
            { value: "ISSUED", label: "Kesildi" },
          ].map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={activeAfStatus === value ? "default" : "outline"}
              onClick={() => toggleAfStatus(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Filtreleri Temizle
          </Button>
        )}

        <div className="ml-auto">
          <Button asChild size="sm">
            <Link href="/sales/new">+ Yeni Satış</Link>
          </Button>
        </div>
      </div>

      {/* Sales table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Ürün</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Ödeme Yöntemi</TableHead>
            <TableHead>Fatura Tipi</TableHead>
            <TableHead>AF Durumu</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticSales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {hasFilters ? "Filtreye uyan satış bulunamadı." : "Henüz satış kaydı yok."}
              </TableCell>
            </TableRow>
          ) : (
            optimisticSales.map((sale) => (
              <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/sales/${sale.id}`)}>
                <TableCell className="text-sm">{formatDate(sale.sale_date)}</TableCell>
                <TableCell className="font-medium">
                  {sale.product_name ?? (sale.device_id ? "Cihaz" : "—")}
                </TableCell>
                <TableCell>
                  {sale.customer_id ? (
                    sale.customer_name ?? "—"
                  ) : (
                    <span className="text-muted-foreground italic">Perakende</span>
                  )}
                </TableCell>
                <TableCell>{formatPrice(sale.sale_price)}</TableCell>
                <TableCell>
                  {sale.payment_method ? PAYMENT_LABELS[sale.payment_method] : "—"}
                </TableCell>
                <TableCell>
                  {sale.invoice_type ? INVOICE_LABELS[sale.invoice_type] : "—"}
                </TableCell>
                <TableCell>
                  {sale.invoice_type === "AF" ? (
                    <AfStatusBadge status={sale.af_status} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteTarget(sale) }}
                  >
                    Sil
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Satışı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.product_name ?? "Bu satış"}</strong> kaydını silmek istediğinizden emin misiniz?
              {deleteTarget?.device_id && " Cihaz stoka geri dönecektir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}