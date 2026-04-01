import { createClient } from "@/lib/supabase/server"
import { NewSaleClient } from "./new-sale-client"
import type { InStockDevice, Contact, Accessory, Brand, Model } from "@/lib/supabase/types"

interface NewSalePageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function NewSalePage({ searchParams }: NewSalePageProps) {
  const { tab } = await searchParams
  const supabase = await createClient()

  const [devicesResult, contactsResult, accessoriesResult, brandsResult, modelsResult] =
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("v_in_stock_devices").select("*").order("brand"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("contacts").select("id, full_name, contact_type").order("full_name"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("accessories")
        .select("id, barcode, brand, category, stock_quantity, sale_price")
        .gt("stock_quantity", 0)
        .order("barcode"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("brands").select("*").order("name"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("models").select("*").order("name"),
    ])

  const devices: InStockDevice[] = devicesResult.data ?? []
  const contacts: Pick<Contact, "id" | "full_name" | "contact_type">[] = contactsResult.data ?? []
  const accessories: Pick<Accessory, "id" | "barcode" | "brand" | "category" | "stock_quantity" | "sale_price">[] =
    accessoriesResult.data ?? []
  const brands: Brand[] = brandsResult.data ?? []
  const models: Model[] = modelsResult.data ?? []
  const suppliers: Pick<Contact, "id" | "full_name">[] = (contactsResult.data ?? [])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Yeni Satış</h2>
      <NewSaleClient
        devices={devices}
        contacts={contacts}
        accessories={accessories}
        brands={brands}
        models={models}
        defaultTab={tab}
        suppliers={suppliers}
      />
    </div>
  )
}
