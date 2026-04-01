"use client"

import { useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { addAccessory, updateAccessory, deleteAccessory } from "@/actions/accessories"
import type { Accessory } from "@/lib/supabase/types"
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface AccessoriesClientProps {
  accessories: Accessory[]
  searchQuery: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price)
}

function stockBadgeVariant(stock: number): "destructive" | "outline" | "secondary" {
  if (stock === 0) return "destructive"
  if (stock <= 5) return "outline"
  return "secondary"
}

function stockBadgeClass(stock: number): string {
  if (stock === 0) return ""
  if (stock <= 5) return "border-yellow-500 text-yellow-700 bg-yellow-50"
  return ""
}

function accessoryLabel(acc: Pick<Accessory, "brand" | "category">): string {
  return [acc.brand, acc.category].filter(Boolean).join(" / ") || "—"
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function AccessoriesClient({ accessories, searchQuery }: AccessoriesClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [optimisticAccessories, dispatchOptimistic] = useOptimistic(
    accessories,
    (
      state: Accessory[],
      action: { type: "add"; item: Accessory } | { type: "update"; item: Accessory } | { type: "delete"; id: string }
    ) => {
      if (action.type === "add") return [action.item, ...state]
      if (action.type === "delete") return state.filter((a) => a.id !== action.id)
      return state.map((a) => (a.id === action.item.id ? action.item : a))
    }
  )

  // Search
  const [searchValue, setSearchValue] = useState(searchQuery)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchValue.trim()) params.set("q", searchValue.trim())
    router.push(`/accessories?${params.toString()}`)
  }

  // Add dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  function openAddDialog() {
    setAddError(null)
    setAddOpen(true)
  }

  async function handleAdd(formData: FormData) {
    setAddError(null)

    const optimisticItem: Accessory = {
      id: `temp-${Date.now()}`,
      barcode: formData.get("barcode") as string,
      brand: (formData.get("brand") as string) || null,
      category: (formData.get("category") as string) || null,
      stock_quantity: parseInt(formData.get("stock_quantity") as string, 10) || 0,
      purchase_price: parseFloat(formData.get("purchase_price") as string) || 0,
      sale_price: parseFloat(formData.get("sale_price") as string) || 0,
      created_at: new Date().toISOString(),
    }

    startTransition(() => {
      dispatchOptimistic({ type: "add", item: optimisticItem })
    })

    const result = await addAccessory(formData)
    if ("error" in result) {
      setAddError(result.error)
      return
    }

    setAddOpen(false)
    router.refresh()
  }

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Accessory | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  function openEditDialog(accessory: Accessory) {
    setEditTarget(accessory)
    setEditError(null)
    setEditOpen(true)
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    setEditError(null)

    const optimisticItem: Accessory = {
      ...editTarget,
      brand: (formData.get("brand") as string) || null,
      category: (formData.get("category") as string) || null,
      stock_quantity: parseInt(formData.get("stock_quantity") as string, 10) || 0,
      purchase_price: parseFloat(formData.get("purchase_price") as string) || 0,
      sale_price: parseFloat(formData.get("sale_price") as string) || 0,
    }

    startTransition(() => {
      dispatchOptimistic({ type: "update", item: optimisticItem })
    })

    const result = await updateAccessory(editTarget.id, formData)
    if ("error" in result) {
      setEditError(result.error)
      return
    }

    setEditOpen(false)
    router.refresh()
  }

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Accessory | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    startTransition(() => {
      dispatchOptimistic({ type: "delete", id: deleteTarget.id })
    })
    const result = await deleteAccessory(deleteTarget.id)
    if ("error" in result) {
      setDeleteError(result.error)
      return
    }
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Search + Add button */}
      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Barkod, marka veya kategori ara..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-72"
          />
          <Button type="submit" variant="outline" size="sm">
            Ara
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchValue("")
                router.push("/accessories")
              }}
            >
              Temizle
            </Button>
          )}
        </form>
        <Button size="sm" onClick={openAddDialog}>
          + Yeni Aksesuar Ekle
        </Button>
      </div>

      {/* Accessories table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Barkod</TableHead>
            <TableHead>Marka / Kategori</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Alış Fiyatı</TableHead>
            <TableHead>Satış Fiyatı</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticAccessories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {searchQuery ? "Arama sonucu bulunamadı." : "Henüz aksesuar eklenmemiş."}
              </TableCell>
            </TableRow>
          ) : (
            optimisticAccessories.map((acc) => (
              <TableRow
                key={acc.id}
                className={`cursor-pointer hover:bg-muted/50 ${acc.id.startsWith("temp-") ? "opacity-60" : ""}`}
                onClick={() => !acc.id.startsWith("temp-") && openEditDialog(acc)}
              >
                <TableCell className="font-mono text-sm">{acc.barcode}</TableCell>
                <TableCell className="font-medium">{accessoryLabel(acc)}</TableCell>
                <TableCell>
                  <Badge
                    variant={stockBadgeVariant(acc.stock_quantity)}
                    className={stockBadgeClass(acc.stock_quantity)}
                  >
                    {acc.stock_quantity}
                  </Badge>
                </TableCell>
                <TableCell>{formatPrice(acc.purchase_price)}</TableCell>
                <TableCell>{formatPrice(acc.sale_price)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!acc.id.startsWith("temp-")) openEditDialog(acc)
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!acc.id.startsWith("temp-")) { setDeleteError(null); setDeleteTarget(acc) }
                      }}
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

      {/* Add Accessory Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Aksesuar Ekle</DialogTitle>
          </DialogHeader>
          <form action={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-barcode">Barkod *</Label>
              <Input id="add-barcode" name="barcode" placeholder="Barkod numarası" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-brand">Marka</Label>
              <Input id="add-brand" name="brand" placeholder="Marka (opsiyonel)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-category">Kategori</Label>
              <Input id="add-category" name="category" placeholder="Kategori (opsiyonel)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-stock">Stok Adedi *</Label>
              <Input
                id="add-stock"
                name="stock_quantity"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-purchase-price">Alış Fiyatı (₺) *</Label>
              <Input
                id="add-purchase-price"
                name="purchase_price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-sale-price">Satış Fiyatı (₺) *</Label>
              <Input
                id="add-sale-price"
                name="sale_price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                İptal
              </Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Accessory Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aksesuar Güncelle</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <form action={handleEdit} className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Barkod: <span className="font-mono font-medium">{editTarget.barcode}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Marka</Label>
                <Input
                  id="edit-brand"
                  name="brand"
                  defaultValue={editTarget.brand ?? ""}
                  placeholder="Marka (opsiyonel)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Kategori</Label>
                <Input
                  id="edit-category"
                  name="category"
                  defaultValue={editTarget.category ?? ""}
                  placeholder="Kategori (opsiyonel)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stok Adedi *</Label>
                <Input
                  id="edit-stock"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editTarget.stock_quantity}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-purchase-price">Alış Fiyatı (₺) *</Label>
                <Input
                  id="edit-purchase-price"
                  name="purchase_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={editTarget.purchase_price}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sale-price">Satış Fiyatı (₺) *</Label>
                <Input
                  id="edit-sale-price"
                  name="sale_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={editTarget.sale_price}
                  required
                />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">Güncelle</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aksesuarı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{[deleteTarget?.brand, deleteTarget?.category].filter(Boolean).join(" / ") || deleteTarget?.barcode}</strong> aksesuarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
