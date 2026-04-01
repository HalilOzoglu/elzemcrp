import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import type { Contact, Sale, ContactType, PaymentMethod, InvoiceType } from "@/lib/supabase/types"

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  CUSTOMER: "Müşteri",
  SUPPLIER: "Tedarikçi",
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  IBAN: "IBAN",
}

const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  AF: "Alış Faturası",
  MF: "Müşteri Faturası",
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr))
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [contactResult, salesResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("contacts") as any).select("*").eq("id", id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("sales") as any)
      .select("*")
      .eq("customer_id", id)
      .order("sale_date", { ascending: false }),
  ])

  if (!contactResult.data) {
    notFound()
  }

  const contact: Contact = contactResult.data
  const sales: Sale[] = salesResult.data ?? []

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Back link */}
      <div>
        <Link href="/contacts" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Geri
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{contact.full_name}</h2>
          {contact.phone && (
            <p className="text-muted-foreground text-sm mt-1">{contact.phone}</p>
          )}
        </div>
        <Badge variant="outline">
          {CONTACT_TYPE_LABELS[contact.contact_type]}
        </Badge>
      </div>

      {/* Contact Info */}
      <section className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Cari Bilgileri
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Ad:</span>{" "}
            <span className="font-medium">{contact.full_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tip:</span>{" "}
            <span className="font-medium">{CONTACT_TYPE_LABELS[contact.contact_type]}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Telefon:</span>{" "}
            <span className="font-medium">{contact.phone ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Kayıt Tarihi:</span>{" "}
            <span className="font-medium">{formatDate(contact.created_at)}</span>
          </div>
        </div>
      </section>

      {/* Sales History */}
      <section className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Geçmiş İşlemler
        </h3>
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz işlem kaydı yok.</p>
        ) : (
          <div className="rounded-md border divide-y text-sm">
            {sales.map((sale) => (
              <Link key={sale.id} href={`/sales/${sale.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-medium">{formatDate(sale.sale_date)}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {sale.payment_method && (
                      <span>{PAYMENT_METHOD_LABELS[sale.payment_method]}</span>
                    )}
                    {sale.invoice_type && (
                      <>
                        <span>·</span>
                        <span>{INVOICE_TYPE_LABELS[sale.invoice_type]}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="font-semibold">{formatPrice(sale.sale_price)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
