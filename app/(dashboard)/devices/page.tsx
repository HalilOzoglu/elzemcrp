import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { DevicesClient } from "./devices-client"
import { StockCountClient } from "./stock-count-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { InStockDevice, Brand, Model } from "@/lib/supabase/types"

interface DevicesPageProps {
  searchParams: Promise<{
    brand?: string
    condition?: string
    foreign?: string
    q?: string
    tab?: string
  }>
}

export default async function DevicesPage({ searchParams }: DevicesPageProps) {
  const { brand, condition, foreign, q, tab } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let devicesQuery = (supabase as any)
    .from("v_in_stock_devices")
    .select("*")
    .order("device_id", { ascending: false })

  if (brand) devicesQuery = devicesQuery.ilike("brand", brand)
  if (condition === "new") devicesQuery = devicesQuery.eq("is_new", true)
  else if (condition === "used") devicesQuery = devicesQuery.eq("is_new", false)
  if (foreign === "true") devicesQuery = devicesQuery.eq("is_foreign", true)
  if (q) {
    devicesQuery = devicesQuery.or(
      `brand.ilike.%${q}%,model.ilike.%${q}%,color.ilike.%${q}%,imei_1.ilike.%${q}%`
    )
  }

  const [devicesResult, brandsResult, modelsResult, totalResult, suppliersResult] = await Promise.all([
    devicesQuery,
    supabase.from("brands").select("*").order("name"),
    supabase.from("models").select("*").order("name"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("v_in_stock_devices").select("device_id", { count: "exact", head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("contacts").select("id, full_name").order("full_name"),
  ])

  const devices: InStockDevice[] = (devicesResult.data ?? []) as InStockDevice[]
  const brands: Brand[] = (brandsResult.data ?? []) as Brand[]
  const models: Model[] = (modelsResult.data ?? []) as Model[]
  const totalCount: number = totalResult.count ?? 0
  const filteredCount: number = devices.length
  const suppliers: { id: string; full_name: string }[] = suppliersResult.data ?? []

  const activeTab = tab === "stock-count" ? "stock-count" : "inventory"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cihaz Envanteri</h2>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {(brand || condition || foreign || q) && (
            <span>Filtrelenen: <strong className="text-foreground">{filteredCount}</strong></span>
          )}
          <span>Toplam stok: <strong className="text-foreground">{totalCount}</strong> cihaz</span>
        </div>
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="inventory">Envanter</TabsTrigger>
          <TabsTrigger value="stock-count">Stok Sayım</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <Suspense fallback={<div className="text-muted-foreground text-sm">Yükleniyor...</div>}>
            <DevicesClient
              devices={devices}
              brands={brands}
              models={models}
              activeBrand={brand ?? ""}
              activeCondition={condition ?? ""}
              activeForeign={foreign === "true"}
              activeQ={q ?? ""}
              suppliers={suppliers}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="stock-count" className="mt-4">
          <StockCountClient devices={devices} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
