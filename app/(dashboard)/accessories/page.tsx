import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { AccessoriesClient } from "./accessories-client"
import type { Accessory } from "@/lib/supabase/types"

interface AccessoriesPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function AccessoriesPage({ searchParams }: AccessoriesPageProps) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase.from("accessories").select("*").order("created_at", { ascending: false })

  if (q && q.trim() !== "") {
    query = query.or(`barcode.ilike.%${q.trim()}%,brand.ilike.%${q.trim()}%,category.ilike.%${q.trim()}%`)
  }

  const { data } = await query
  const accessories: Accessory[] = (data ?? []) as Accessory[]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Aksesuar Yönetimi</h2>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Yükleniyor...</div>}>
        <AccessoriesClient accessories={accessories} searchQuery={q ?? ""} />
      </Suspense>
    </div>
  )
}
