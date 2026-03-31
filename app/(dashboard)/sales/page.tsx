import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { SalesClient } from "./sales-client"
import { Button } from "@/components/ui/button"
import type { PaymentMethod, InvoiceType } from "@/lib/supabase/types"

interface SalesPageProps {
  searchParams: Promise<{
    from?: string
    to?: string
    payment?: string
    invoice?: string
  }>
}

export interface SaleRow {
  id: string
  sale_date: string
  sale_price: number
  payment_method: PaymentMethod | null
  invoice_type: InvoiceType | null
  customer_id: string | null
  customer_name: string | null
  device_id: string | null
  product_name: string | null
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const { from, to, payment, invoice } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("sales")
    .select(
      `
      id,
      sale_date,
      sale_price,
      payment_method,
      invoice_type,
      customer_id,
      device_id,
      contacts ( full_name ),
      devices ( id, model_variants ( model_id, models ( name, brands ( name ) ) ) )
    `
    )
    .order("sale_date", { ascending: false })

  if (from) {
    query = query.gte("sale_date", from)
  }
  if (to) {
    query = query.lte("sale_date", `${to}T23:59:59`)
  }
  if (payment === "CASH" || payment === "CREDIT_CARD" || payment === "IBAN") {
    query = query.eq("payment_method", payment)
  }
  if (invoice === "AF" || invoice === "MF") {
    query = query.eq("invoice_type", invoice)
  }

  const { data } = await query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sales: SaleRow[] = ((data ?? []) as any[]).map((row: any) => {
    let productName: string | null = null
    if (row.device_id && row.devices) {
      const brand = row.devices?.model_variants?.models?.brands?.name ?? ""
      const model = row.devices?.model_variants?.models?.name ?? ""
      productName = [brand, model].filter(Boolean).join(" ") || "Cihaz"
    }

    return {
      id: row.id,
      sale_date: row.sale_date,
      sale_price: row.sale_price,
      payment_method: row.payment_method,
      invoice_type: row.invoice_type,
      customer_id: row.customer_id,
      customer_name: row.contacts?.full_name ?? null,
      device_id: row.device_id,
      product_name: productName,
    }
  })

  const activePayment =
    payment === "CASH" || payment === "CREDIT_CARD" || payment === "IBAN"
      ? (payment as PaymentMethod)
      : null
  const activeInvoice = invoice === "AF" || invoice === "MF" ? (invoice as InvoiceType) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Satış Listesi</h2>
        <Button asChild size="sm">
          <Link href="/sales/new">+ Yeni Satış</Link>
        </Button>
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Yükleniyor...</div>}>
        <SalesClient
          sales={sales}
          activeFrom={from ?? ""}
          activeTo={to ?? ""}
          activePayment={activePayment}
          activeInvoice={activeInvoice}
        />
      </Suspense>
    </div>
  )
}
