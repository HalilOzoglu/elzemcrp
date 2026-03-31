"use client"

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalesClientProps {
  sales: SaleRow[]
  activeFrom: string
  activeTo: string
  activePayment: PaymentMethod | null
  activeInvoice: InvoiceType | null
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function SalesClient({
  sales,
  activeFrom,
  activeTo,
  activePayment,
  activeInvoice,
}: SalesClientProps) {
  const router = useRouter()

  function buildParams(overrides: Record<string, string | null>) {
    const params = new URLSearchParams()
    const current: Record<string, string | null> = {
      from: activeFrom || null,
      to: activeTo || null,
      payment: activePayment,
      invoice: activeInvoice,
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

  function clearFilters() {
    router.push("/sales")
  }

  const hasFilters = activeFrom || activeTo || activePayment || activeInvoice

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {hasFilters ? "Filtreye uyan satış bulunamadı." : "Henüz satış kaydı yok."}
              </TableCell>
            </TableRow>
          ) : (
            sales.map((sale) => (
              <TableRow key={sale.id}>
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
