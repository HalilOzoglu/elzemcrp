import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { DevicesClient } from "./devices-client"
import type { InStockDevice, Brand, Model } from "@/lib/supabase/types"

interface DevicesPageProps {
  searchParams: Promise<{
    brand?: string
    condition?: string
    foreign?: string
    q?: string
  }>
}

export default async function DevicesPage({ searchParams }: DevicesPageProps) {
  const { brand, condition, foreign, q } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let devicesQuery = (supabase as any)
    .from("v_in_stock_devices")
    .select("*")
    .order("device_id", { ascending: false })

  if (brand) {
    devicesQuery = devicesQuery.eq("brand", brand)
  }
  if (condition === "new") {
    devicesQuery = devicesQuery.eq("is_new", true)
  } else if (condition === "used") {
    devicesQuery = devicesQuery.eq("is_new", false)
  }
  if (foreign === "true") {
    devicesQuery = devicesQuery.eq("is_foreign", true)
  }
  if (q) {
    devicesQuery = devicesQuery.or(
      `brand.ilike.%${q}%,model.ilike.%${q}%,color.ilike.%${q}%,imei_1.ilike.%${q}%`
    )
  }

  const [devicesResult, brandsResult, modelsResult] = await Promise.all([
    devicesQuery,
    supabase.from("brands").select("*").order("name"),
    supabase.from("models").select("*").order("name"),
  ])

  const devices: InStockDevice[] = (devicesResult.data ?? []) as InStockDevice[]
  const brands: Brand[] = (brandsResult.data ?? []) as Brand[]
  const models: Model[] = (modelsResult.data ?? []) as Model[]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Cihaz Envanteri</h2>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Yükleniyor...</div>}>
        <DevicesClient
          devices={devices}
          brands={brands}
          models={models}
          activeBrand={brand ?? ""}
          activeCondition={condition ?? ""}
          activeForeign={foreign === "true"}
          activeQ={q ?? ""}
        />
      </Suspense>
    </div>
  )
}
