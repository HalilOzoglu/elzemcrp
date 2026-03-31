import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { CatalogClient } from "./catalog-client"
import type { Brand, Model, ModelVariant } from "@/lib/supabase/types"

interface CatalogPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { tab } = await searchParams
  const activeTab = tab === "models" || tab === "variants" ? tab : "brands"

  const supabase = await createClient()

  const [brandsResult, modelsResult, variantsResult] = await Promise.all([
    supabase.from("brands").select("*").order("name"),
    supabase
      .from("models")
      .select("*, brands(name)")
      .order("name"),
    supabase
      .from("model_variants")
      .select("*, models(name, brands(name))")
      .order("created_at", { ascending: false }),
  ])

  const brands: Brand[] = (brandsResult.data ?? []) as Brand[]

  // Flatten models with brand_name
  const models = ((modelsResult.data ?? []) as (Model & { brands: { name: string } | null })[]).map(
    (m) => ({
      id: m.id,
      brand_id: m.brand_id,
      name: m.name,
      created_at: m.created_at,
      brand_name: m.brands?.name ?? "",
    })
  )

  // Flatten variants with model_name and brand_name
  const variants = (
    (variantsResult.data ?? []) as (ModelVariant & {
      models: { name: string; brands: { name: string } | null } | null
    })[]
  ).map((v) => ({
    id: v.id,
    model_id: v.model_id,
    color: v.color,
    storage: v.storage,
    created_at: v.created_at,
    model_name: v.models?.name ?? "",
    brand_name: v.models?.brands?.name ?? "",
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Katalog Yönetimi</h2>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Yükleniyor...</div>}>
        <CatalogClient
          brands={brands}
          models={models}
          variants={variants}
          defaultTab={activeTab}
        />
      </Suspense>
    </div>
  )
}
