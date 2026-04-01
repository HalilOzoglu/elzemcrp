"use client"

import { useOptimistic, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  addBrand,
  updateBrand,
  deleteBrand,
  addModel,
  updateModel,
  deleteModel,
  addVariant,
  updateVariant,
  deleteVariant,
} from "@/actions/catalog"
import type { Brand, Model, ModelVariant } from "@/lib/supabase/types"

// ─── Extended types with join data ───────────────────────────────────────────

export type ModelWithBrand = Model & { brand_name: string }
export type VariantWithModel = ModelVariant & {
  model_name: string
  brand_name: string
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CatalogClientProps {
  brands: Brand[]
  models: ModelWithBrand[]
  variants: VariantWithModel[]
  defaultTab: string
}

// ─── Brands Tab ───────────────────────────────────────────────────────────────

function BrandsTab({ brands }: { brands: Brand[] }) {
  const [optimisticBrands, addOptimistic] = useOptimistic(
    brands,
    (state: Brand[], action: { type: "add"; item: Brand } | { type: "delete"; id: string }) => {
      if (action.type === "add") return [...state, action.item]
      if (action.type === "delete") return state.filter((b) => b.id !== action.id)
      return state
    }
  )

  const [, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editBrand, setEditBrand] = useState<Brand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openAdd() {
    setEditBrand(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(brand: Brand) {
    setEditBrand(brand)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(formData: FormData) {
    setFormError(null)
    if (editBrand) {
      const result = await updateBrand(editBrand.id, formData)
      if ("error" in result) {
        setFormError(result.error)
        return
      }
    } else {
      const tempId = `temp-${Date.now()}`
      const name = formData.get("name") as string
      startTransition(() => {
        addOptimistic({ type: "add", item: { id: tempId, name, created_at: new Date().toISOString() } })
      })
      const result = await addBrand(formData)
      if ("error" in result) {
        setFormError(result.error)
        return
      }
    }
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    startTransition(() => {
      addOptimistic({ type: "delete", id: deleteTarget.id })
    })
    const result = await deleteBrand(deleteTarget.id)
    if ("error" in result) {
      setDeleteError(result.error)
      return
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {optimisticBrands.length} marka
        </h3>
        <Button size="sm" onClick={openAdd}>
          + Marka Ekle
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Marka Adı</TableHead>
            <TableHead>Eklenme Tarihi</TableHead>
            <TableHead className="w-[120px]">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticBrands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Henüz marka eklenmemiş.
              </TableCell>
            </TableRow>
          ) : (
            optimisticBrands.map((brand) => (
              <TableRow key={brand.id} className={brand.id.startsWith("temp-") ? "opacity-60" : ""}>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(brand.created_at).toLocaleDateString("tr-TR")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(brand)}>
                      Düzenle
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { setDeleteError(null); setDeleteTarget(brand) }}
                    >
                      Sil
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBrand ? "Markayı Düzenle" : "Yeni Marka Ekle"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Marka Adı</Label>
              <Input
                id="brand-name"
                name="name"
                defaultValue={editBrand?.name ?? ""}
                placeholder="Örn: Samsung"
                required
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit">{editBrand ? "Güncelle" : "Ekle"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Markayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> markasını silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Models Tab ───────────────────────────────────────────────────────────────

function ModelsTab({ models, brands }: { models: ModelWithBrand[]; brands: Brand[] }) {
  const [optimisticModels, addOptimistic] = useOptimistic(
    models,
    (
      state: ModelWithBrand[],
      action: { type: "add"; item: ModelWithBrand } | { type: "delete"; id: string }
    ) => {
      if (action.type === "add") return [...state, action.item]
      if (action.type === "delete") return state.filter((m) => m.id !== action.id)
      return state
    }
  )

  const [, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editModel, setEditModel] = useState<ModelWithBrand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ModelWithBrand | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [filterBrandId, setFilterBrandId] = useState("")

  const filteredModels = filterBrandId
    ? optimisticModels.filter((m) => m.brand_id === filterBrandId)
    : optimisticModels

  function openAdd() {
    setEditModel(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(model: ModelWithBrand) {
    setEditModel(model)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(formData: FormData) {
    setFormError(null)
    if (editModel) {
      const result = await updateModel(editModel.id, formData)
      if ("error" in result) { setFormError(result.error); return }
    } else {
      const tempId = `temp-${Date.now()}`
      const brandId = formData.get("brand_id") as string
      const brand = brands.find((b) => b.id === brandId)
      startTransition(() => {
        addOptimistic({
          type: "add",
          item: {
            id: tempId,
            brand_id: brandId,
            brand_name: brand?.name ?? "",
            name: formData.get("name") as string,
            created_at: new Date().toISOString(),
          },
        })
      })
      const result = await addModel(formData)
      if ("error" in result) { setFormError(result.error); return }
    }
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    startTransition(() => {
      addOptimistic({ type: "delete", id: deleteTarget.id })
    })
    const result = await deleteModel(deleteTarget.id)
    if ("error" in result) { setDeleteError(result.error); return }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {filteredModels.length} model
          </h3>
          <select
            value={filterBrandId}
            onChange={(e) => setFilterBrandId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Tüm Markalar</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={openAdd}>
          + Model Ekle
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model Adı</TableHead>
            <TableHead>Marka</TableHead>
            <TableHead className="w-[120px]">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredModels.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Henüz model eklenmemiş.
              </TableCell>
            </TableRow>
          ) : (
            filteredModels.map((model) => (
              <TableRow key={model.id} className={model.id.startsWith("temp-") ? "opacity-60" : ""}>
                <TableCell className="font-medium">{model.name}</TableCell>
                <TableCell>{model.brand_name}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(model)}>
                      Düzenle
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { setDeleteError(null); setDeleteTarget(model) }}
                    >
                      Sil
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editModel ? "Modeli Düzenle" : "Yeni Model Ekle"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-brand">Marka</Label>
              <select
                id="model-brand"
                name="brand_id"
                defaultValue={editModel?.brand_id ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Marka seçin</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Adı</Label>
              <Input
                id="model-name"
                name="name"
                defaultValue={editModel?.name ?? ""}
                placeholder="Örn: Galaxy S24"
                required
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit">{editModel ? "Güncelle" : "Ekle"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modeli Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> modelini silmek istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Variants Tab ─────────────────────────────────────────────────────────────

function VariantsTab({
  variants,
  models,
}: {
  variants: VariantWithModel[]
  models: ModelWithBrand[]
}) {
  const [optimisticVariants, addOptimistic] = useOptimistic(
    variants,
    (
      state: VariantWithModel[],
      action: { type: "add"; item: VariantWithModel } | { type: "delete"; id: string }
    ) => {
      if (action.type === "add") return [...state, action.item]
      if (action.type === "delete") return state.filter((v) => v.id !== action.id)
      return state
    }
  )

  const [, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editVariant, setEditVariant] = useState<VariantWithModel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VariantWithModel | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openAdd() {
    setEditVariant(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(variant: VariantWithModel) {
    setEditVariant(variant)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(formData: FormData) {
    setFormError(null)
    if (editVariant) {
      const result = await updateVariant(editVariant.id, formData)
      if ("error" in result) { setFormError(result.error); return }
    } else {
      const tempId = `temp-${Date.now()}`
      const modelId = formData.get("model_id") as string
      const model = models.find((m) => m.id === modelId)
      startTransition(() => {
        addOptimistic({
          type: "add",
          item: {
            id: tempId,
            model_id: modelId,
            model_name: model?.name ?? "",
            brand_name: model?.brand_name ?? "",
            color: formData.get("color") as string,
            storage: formData.get("storage") as string,
            created_at: new Date().toISOString(),
          },
        })
      })
      const result = await addVariant(formData)
      if ("error" in result) { setFormError(result.error); return }
    }
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    startTransition(() => {
      addOptimistic({ type: "delete", id: deleteTarget.id })
    })
    const result = await deleteVariant(deleteTarget.id)
    if ("error" in result) { setDeleteError(result.error); return }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {optimisticVariants.length} varyant
        </h3>
        <Button size="sm" onClick={openAdd}>
          + Varyant Ekle
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Marka</TableHead>
            <TableHead>Renk</TableHead>
            <TableHead>Hafıza</TableHead>
            <TableHead className="w-[120px]">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticVariants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Henüz varyant eklenmemiş.
              </TableCell>
            </TableRow>
          ) : (
            optimisticVariants.map((variant) => (
              <TableRow key={variant.id} className={variant.id.startsWith("temp-") ? "opacity-60" : ""}>
                <TableCell className="font-medium">{variant.model_name}</TableCell>
                <TableCell>{variant.brand_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{variant.color}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{variant.storage}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(variant)}>
                      Düzenle
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { setDeleteError(null); setDeleteTarget(variant) }}
                    >
                      Sil
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editVariant ? "Varyantı Düzenle" : "Yeni Varyant Ekle"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="variant-model">Model</Label>
              <select
                id="variant-model"
                name="model_id"
                defaultValue={editVariant?.model_id ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Model seçin</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand_name} — {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant-color">Renk</Label>
              <Input
                id="variant-color"
                name="color"
                defaultValue={editVariant?.color ?? ""}
                placeholder="Örn: Siyah"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant-storage">Hafıza</Label>
              <Input
                id="variant-storage"
                name="storage"
                defaultValue={editVariant?.storage ?? ""}
                placeholder="Örn: 128GB"
                required
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit">{editVariant ? "Güncelle" : "Ekle"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Varyantı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.color} / {deleteTarget?.storage}</strong> varyantını silmek istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function CatalogClient({ brands, models, variants, defaultTab }: CatalogClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`/catalog?${params.toString()}`)
  }

  return (
    <Tabs defaultValue={defaultTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="brands">Markalar</TabsTrigger>
        <TabsTrigger value="models">Modeller</TabsTrigger>
        <TabsTrigger value="variants">Varyantlar</TabsTrigger>
      </TabsList>

      <TabsContent value="brands" className="mt-4">
        <BrandsTab brands={brands} />
      </TabsContent>

      <TabsContent value="models" className="mt-4">
        <ModelsTab models={models} brands={brands} />
      </TabsContent>

      <TabsContent value="variants" className="mt-4">
        <VariantsTab variants={variants} models={models} />
      </TabsContent>
    </Tabs>
  )
}
