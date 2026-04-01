import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { SaleEditClient } from "./sale-edit-client"
import type { PaymentMethod, InvoiceType, Contact } from "@/lib/supabase/types"

interface SaleDetailPageProps {
  params: Promise<{ id: string }>
}

export interface SaleDetail {
  id: string
  sale_date: string
  sale_price: number
  payment_method: PaymentMethod | null
  invoice_type: InvoiceType | null
  af_status: string | null
  customer_id: string | null
  customer_name: string | null
  device_id: string | null
  product_name: string | null
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [saleResult, contactsResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("sales")
      .select(`
        id, sale_date, sale_price, payment_method, invoice_type, af_status, customer_id, device_id,
        contacts:customer_id ( full_name ),
        devices:device_id (
          id,
          model_variants:variant_id (
            color, storage,
            models:model_id ( name, brands:brand_id ( name ) )
          )
        )
      `)
      .eq("id", id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("contacts").select("id, full_name, contact_type").order("full_name"),
  ])

  if (!saleResult.data) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = saleResult.data as any
  let productName: string | null = null
  if (row.device_id && row.devices) {
    const brand = row.devices?.model_variants?.models?.brands?.name ?? ""
    const model = row.devices?.model_variants?.models?.name ?? ""
    const color = row.devices?.model_variants?.color ?? ""
    const storage = row.devices?.model_variants?.storage ?? ""
    productName = [brand, model, color, storage].filter(Boolean).join(" ") || "Cihaz"
  }

  const sale: SaleDetail = {
    id: row.id,
    sale_date: row.sale_date,
    sale_price: row.sale_price,
    payment_method: row.payment_method,
    invoice_type: row.invoice_type,
    af_status: row.af_status ?? null,
    customer_id: row.customer_id,
    customer_name: row.contacts?.full_name ?? null,
    device_id: row.device_id,
    product_name: productName,
  }

  const contacts: Pick<Contact, "id" | "full_name" | "contact_type">[] = contactsResult.data ?? []

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link href="/sales" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Geri
        </Link>
      </div>
      <h2 className="text-xl font-semibold">Satış Detayı</h2>
      <SaleEditClient sale={sale} contacts={contacts} />
    </div>
  )
}
