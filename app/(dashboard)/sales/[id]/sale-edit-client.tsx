"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateSale } from "@/actions/sales"
import type { PaymentMethod, InvoiceType, Contact } from "@/lib/supabase/types"
import type { SaleDetail } from "./page"

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  IBAN: "IBAN",
}

const INVOICE_LABELS: Record<InvoiceType, string> = {
  AF: "Alış Faturası (AF)",
  MF: "Müşteri Faturası (MF)",
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

interface SaleEditClientProps {
  sale: SaleDetail
  contacts: Pick<Contact, "id" | "full_name" | "contact_type">[]
}

export function SaleEditClient({ sale, contacts }: SaleEditClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateSale(sale.id, formData)
      if ("error" in result) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Read-only info */}
      <div className="rounded-lg border p-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tarih</span>
          <span className="font-medium">{formatDate(sale.sale_date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ürün</span>
          <span className="font-medium">{sale.product_name ?? "—"}</span>
        </div>
        {sale.af_status && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">AF Durumu</span>
            <span className="font-medium">{sale.af_status === "PENDING" ? "Bekleyen" : "Kesildi"}</span>
          </div>
        )}
      </div>

      {/* Editable form */}
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="sale_price">Satış Fiyatı (₺) *</Label>
          <Input
            id="sale_price" name="sale_price" type="number" min="0.01" step="0.01"
            defaultValue={sale.sale_price} required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="payment_method">Ödeme Yöntemi</Label>
          <select id="payment_method" name="payment_method" defaultValue={sale.payment_method ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Seçiniz (opsiyonel)</option>
            {(["CASH", "CREDIT_CARD", "IBAN"] as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="invoice_type">Fatura Tipi</Label>
          <select id="invoice_type" name="invoice_type" defaultValue={sale.invoice_type ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Seçiniz (opsiyonel)</option>
            {(["AF", "MF"] as InvoiceType[]).map((t) => (
              <option key={t} value={t}>{INVOICE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="contact_id">Müşteri</Label>
          <select id="contact_id" name="contact_id" defaultValue={sale.customer_id ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Perakende</option>
            {contacts.filter((c) => c.contact_type === "CUSTOMER").map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Satış güncellendi.</p>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/sales")}>
            Geri Dön
          </Button>
        </div>
      </form>
    </div>
  )
}
