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
import { addContact, updateContact, deleteContact } from "@/actions/contacts"
import type { ContactVolume, ContactType } from "@/lib/supabase/types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContactsClientProps {
  contacts: ContactVolume[]
  activeType: ContactType | "all"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  CUSTOMER: "Müşteri",
  SUPPLIER: "Tedarikçi",
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function ContactsClient({ contacts, activeType }: ContactsClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [optimisticContacts, dispatchOptimistic] = useOptimistic(
    contacts,
    (
      state: ContactVolume[],
      action:
        | { type: "add"; item: ContactVolume }
        | { type: "update"; item: ContactVolume }
        | { type: "delete"; id: string }
    ) => {
      if (action.type === "add") return [action.item, ...state]
      if (action.type === "update")
        return state.map((c) => (c.contact_id === action.item.contact_id ? action.item : c))
      return state.filter((c) => c.contact_id !== action.id)
    }
  )

  // ─── Filter buttons ──────────────────────────────────────────────────────────

  function setFilter(type: ContactType | "all") {
    const params = new URLSearchParams()
    if (type !== "all") params.set("type", type)
    router.push(`/contacts?${params.toString()}`)
  }

  // ─── Add dialog ──────────────────────────────────────────────────────────────

  const [addOpen, setAddOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  function openAddDialog() {
    setAddError(null)
    setAddOpen(true)
  }

  async function handleAdd(formData: FormData) {
    setAddError(null)

    const optimisticItem: ContactVolume = {
      contact_id: `temp-${Date.now()}`,
      full_name: formData.get("name") as string,
      contact_type: formData.get("contact_type") as ContactType,
      phone: null,
      total_purchased_from: 0,
      total_sold_to: 0,
    }

    startTransition(() => {
      dispatchOptimistic({ type: "add", item: optimisticItem })
    })

    const result = await addContact(formData)
    if ("error" in result) {
      setAddError(result.error)
      return
    }

    setAddOpen(false)
    router.refresh()
  }

  // ─── Edit dialog ─────────────────────────────────────────────────────────────

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ContactVolume | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  function openEditDialog(contact: ContactVolume) {
    setEditTarget(contact)
    setEditError(null)
    setEditOpen(true)
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    setEditError(null)

    const optimisticItem: ContactVolume = {
      ...editTarget,
      full_name: formData.get("name") as string,
      contact_type: formData.get("contact_type") as ContactType,
    }

    startTransition(() => {
      dispatchOptimistic({ type: "update", item: optimisticItem })
    })

    const result = await updateContact(editTarget.contact_id, formData)
    if ("error" in result) {
      setEditError(result.error)
      return
    }

    setEditOpen(false)
    router.refresh()
  }

  // ─── Delete dialog ───────────────────────────────────────────────────────────

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContactVolume | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openDeleteDialog(contact: ContactVolume) {
    setDeleteTarget(contact)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)

    const result = await deleteContact(deleteTarget.contact_id)
    if ("error" in result) {
      setDeleteError(result.error)
      return
    }

    startTransition(() => {
      dispatchOptimistic({ type: "delete", id: deleteTarget.contact_id })
    })

    setDeleteOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Filter buttons + Add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant={activeType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tümü
          </Button>
          <Button
            variant={activeType === "CUSTOMER" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("CUSTOMER")}
          >
            Müşteriler
          </Button>
          <Button
            variant={activeType === "SUPPLIER" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("SUPPLIER")}
          >
            Tedarikçiler
          </Button>
        </div>
        <Button size="sm" onClick={openAddDialog}>
          + Yeni Cari Ekle
        </Button>
      </div>

      {/* Contacts table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead>Alınan Toplam</TableHead>
            <TableHead>Satılan Toplam</TableHead>
            <TableHead className="w-28"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticContacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Henüz cari eklenmemiş.
              </TableCell>
            </TableRow>
          ) : (
            optimisticContacts.map((contact) => (
              <TableRow
                key={contact.contact_id}
                className={`cursor-pointer hover:bg-muted/50 ${contact.contact_id.startsWith("temp-") ? "opacity-60" : ""}`}
                onClick={() => {
                  if (!contact.contact_id.startsWith("temp-")) {
                    router.push(`/contacts/${contact.contact_id}`)
                  }
                }}
              >
                <TableCell className="font-medium">{contact.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{contact.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {CONTACT_TYPE_LABELS[contact.contact_type]}
                  </Badge>
                </TableCell>
                <TableCell>{formatPrice(contact.total_purchased_from)}</TableCell>
                <TableCell>{formatPrice(contact.total_sold_to)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!contact.contact_id.startsWith("temp-")) openEditDialog(contact)
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
                        if (!contact.contact_id.startsWith("temp-")) openDeleteDialog(contact)
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

      {/* Add Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Cari Ekle</DialogTitle>
          </DialogHeader>
          <form action={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Ad *</Label>
              <Input id="add-name" name="name" placeholder="Cari adı" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-type">Cari Tipi *</Label>
              <select
                id="add-type"
                name="contact_type"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Seçiniz...</option>
                <option value="CUSTOMER">Müşteri</option>
                <option value="SUPPLIER">Tedarikçi</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Telefon</Label>
              <Input id="add-phone" name="phone" placeholder="Telefon numarası (opsiyonel)" />
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

      {/* Edit Contact Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cari Güncelle</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <form action={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Ad *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editTarget.full_name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Cari Tipi *</Label>
                <select
                  id="edit-type"
                  name="contact_type"
                  required
                  defaultValue={editTarget.contact_type}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="CUSTOMER">Müşteri</option>
                  <option value="SUPPLIER">Tedarikçi</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefon</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  defaultValue={editTarget.phone ?? ""}
                  placeholder="Telefon numarası (opsiyonel)"
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

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cariyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.full_name}</strong> adlı cariyi silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteError(null)}>İptal</AlertDialogCancel>
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
