import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { ContactsClient } from "./contacts-client"
import type { ContactVolume, ContactType } from "@/lib/supabase/types"

interface ContactsPageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { type } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("v_contact_volumes")
    .select("*")
    .order("full_name", { ascending: true })

  if (type === "CUSTOMER" || type === "SUPPLIER") {
    query = query.eq("contact_type", type)
  }

  const { data } = await query
  const contacts: ContactVolume[] = (data ?? []) as ContactVolume[]
  const activeType: ContactType | "all" =
    type === "CUSTOMER" || type === "SUPPLIER" ? (type as ContactType) : "all"

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Cari Yönetimi</h2>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Yükleniyor...</div>}>
        <ContactsClient contacts={contacts} activeType={activeType} />
      </Suspense>
    </div>
  )
}
