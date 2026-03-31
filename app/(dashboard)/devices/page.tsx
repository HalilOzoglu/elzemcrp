import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { DevicesClient } from "./devices-client"
import type { InStockDevice, Brand, Model } from "@/lib/supabase/types"

export default async function DevicesPage() {
  const supabase = await createClient()

  const [devicesResult, brandsResult, modelsResult] = await Promise.all([
    supabase
      .from("v_in_stock_devices")
      .select("*")
      .order("device_id", { ascending: false }),
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
        <DevicesClient devices={devices} brands={brands} models={models} />
      </Suspense>
    </div>
  )
}
