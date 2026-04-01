"use client"

import { useOptimistic, useState, useTransition, useEffect, useCallback, useRef } from "react"
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
import { createClient } from "@/lib/supabase/client"
import { addDevice, updateDevice, deleteDevice } from "@/actions/devices"
import type { InStockDevice, Brand, Model } from "@/lib/supabase/types"

interface DevicesClientProps {
  devices: InStockDevice[]
  brands: Brand[]
  models: Model[]
  activeBrand: string
  activeCondition: string
  activeForeign: boolean
  activeQ: string
}

function formatPrice(price: number | null): string {
  if (price === null) return "—"
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price)
}

function BatteryBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>
  const color =
    value >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : value >= 50
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      %{value}
    </span>
  )
}

function CheckboxField({
  id, name, label, checked, onChange,
}: {
  id: string; name: string; label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox" id={id} name={name} value="true" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}

// ─── Add Device Dialog ────────────────────────────────────────────────────────

interface AddDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  brands: Brand[]
  models: Model[]
  onAdd: (formData: FormData) => Promise<void>
  error: string | null
}

function AddDeviceDialog({ open, onOpenChange, brands, models, onAdd, error }: AddDialogProps) {
  const [selectedBrandId, setSelectedBrandId] = useState("")
  const [selectedModelId, setSelectedModelId] = useState("")
  const [isDualSim, setIsDualSim] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [isForeign, setIsForeign] = useState(false)
  const [hasBox, setHasBox] = useState(true)
  const [hasInvoice, setHasInvoice] = useState(false)
  const [warrantyMonths, setWarrantyMonths] = useState("24")
  const [colorOptions, setColorOptions] = useState<string[]>([])
  const [storageOptions, setStorageOptions] = useState<string[]>([])

  useEffect(() => {
    if (!selectedModelId) { setColorOptions([]); setStorageOptions([]); return }
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from("model_variants")
      .select("color, storage")
      .eq("model_id", selectedModelId)
      .then(({ data }: { data: { color: string; storage: string }[] | null }) => {
        if (!data) return
        setColorOptions([...new Set(data.map((v) => v.color))])
        setStorageOptions([...new Set(data.map((v) => v.storage))])
      })
  }, [selectedModelId])

  function handleIsNewChange(v: boolean) {
    setIsNew(v)
    setWarrantyMonths(v ? "24" : "0")
  }

  const filteredModels = models.filter((m) => m.brand_id === selectedBrandId)

  function handleOpenChange(v: boolean) {
    if (!v) {
      setSelectedBrandId(""); setSelectedModelId("")
      setIsDualSim(false); setIsNew(true); setIsForeign(false)
      setHasBox(true); setHasInvoice(false); setWarrantyMonths("24")
      setColorOptions([]); setStorageOptions([])
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Cihaz Ekle</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            fd.set("is_dual_sim", isDualSim ? "true" : "false")
            fd.set("is_new", isNew ? "true" : "false")
            fd.set("is_foreign", isForeign ? "true" : "false")
            fd.set("has_box", hasBox ? "true" : "false")
            fd.set("has_invoice", hasInvoice ? "true" : "false")
            fd.set("warranty_months", warrantyMonths)
            await onAdd(fd)
          }}
          className="space-y-4 mt-2"
        >
          <div className="space-y-1">
            <Label htmlFor="add_brand_id">Marka *</Label>
            <select id="add_brand_id" name="brand_id" required value={selectedBrandId}
              onChange={(e) => { setSelectedBrandId(e.target.value); setSelectedModelId("") }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Marka seçin...</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="add_model_id">Model *</Label>
            <select id="add_model_id" name="model_id" required value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={!selectedBrandId}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
              <option value="">Model seçin...</option>
              {filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="add_color">Renk *</Label>
              <Input id="add_color" name="color" placeholder="Siyah" required list="add_color_list" />
              <datalist id="add_color_list">
                {colorOptions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="add_storage">Hafıza *</Label>
              <Input id="add_storage" name="storage" placeholder="128GB" required list="add_storage_list" />
              <datalist id="add_storage_list">
                {storageOptions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <CheckboxField id="add_is_dual_sim" name="is_dual_sim" label="Çift SIM" checked={isDualSim} onChange={setIsDualSim} />
          <div className="space-y-1">
            <Label htmlFor="add_purchase_price">Alış Fiyatı (₺) *</Label>
            <Input id="add_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="add_recommended_sale_price">Vitrin Fiyatı (₺)</Label>
            <Input id="add_recommended_sale_price" name="recommended_sale_price" type="number" min="0.01" step="0.01" placeholder="0.00 (opsiyonel)" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="add_imei_1">IMEI 1</Label>
            <Input id="add_imei_1" name="imei_1" placeholder="15 haneli IMEI" maxLength={15} />
          </div>
          {isDualSim && (
            <div className="space-y-1">
              <Label htmlFor="add_imei_2">IMEI 2</Label>
              <Input id="add_imei_2" name="imei_2" placeholder="15 haneli IMEI (opsiyonel)" maxLength={15} />
            </div>
          )}
          <CheckboxField id="add_is_new" name="is_new" label="Sıfır cihaz" checked={isNew} onChange={handleIsNewChange} />
          <CheckboxField id="add_is_foreign" name="is_foreign" label="Yabancı menşei" checked={isForeign} onChange={setIsForeign} />
          <CheckboxField id="add_has_box" name="has_box" label="Kutu var" checked={hasBox} onChange={setHasBox} />
          <CheckboxField id="add_has_invoice" name="has_invoice" label="Fatura var" checked={hasInvoice} onChange={setHasInvoice} />
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="add_warranty_months">Garanti (ay)</Label>
              <Input
                id="add_warranty_months" name="warranty_months" type="number" min="0"
                value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add_battery_health">Pil Durumu (%)</Label>
              <Input
                id="add_battery_health" name="battery_health" type="number" min="0" max="100"
                placeholder={isNew ? "100 (otomatik)" : "0-100"}
                disabled={isNew}
                defaultValue={isNew ? "100" : ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add_barcode">Barkod</Label>
              <Input id="add_barcode" name="barcode" placeholder="Opsiyonel" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>İptal</Button>
            <Button type="submit">Ekle</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Device Dialog ───────────────────────────────────────────────────────

interface EditDialogProps {
  device: InStockDevice | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (deviceId: string, formData: FormData) => Promise<void>
  error: string | null
}

function EditDeviceDialog({ device, open, onOpenChange, onSave, error }: EditDialogProps) {
  const [isDualSim, setIsDualSim] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [isForeign, setIsForeign] = useState(false)
  const [hasBox, setHasBox] = useState(false)
  const [hasInvoice, setHasInvoice] = useState(false)
  const [warrantyMonths, setWarrantyMonths] = useState("0")

  useEffect(() => {
    if (!device) return
    setIsDualSim(device.is_dual_sim)
    setIsNew(device.is_new)
    setIsForeign(device.is_foreign)
    setHasBox(device.has_box)
    setHasInvoice(device.has_invoice)
    setWarrantyMonths(String(device.warranty_months ?? 0))
  }, [device?.device_id])

  function handleIsNewChange(v: boolean) {
    setIsNew(v)
    setWarrantyMonths(v ? "24" : "0")
  }

  if (!device) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cihaz Düzenle — {device.brand} {device.model}</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            fd.set("is_dual_sim", isDualSim ? "true" : "false")
            fd.set("is_new", isNew ? "true" : "false")
            fd.set("is_foreign", isForeign ? "true" : "false")
            fd.set("has_box", hasBox ? "true" : "false")
            fd.set("has_invoice", hasInvoice ? "true" : "false")
            fd.set("warranty_months", warrantyMonths)
            await onSave(device.device_id, fd)
          }}
          className="space-y-4 mt-2"
        >
          <div className="space-y-1">
            <Label htmlFor="edit_purchase_price">Alış Fiyatı (₺) *</Label>
            <Input id="edit_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" defaultValue={device.purchase_price} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit_recommended_sale_price">Vitrin Fiyatı (₺)</Label>
            <Input id="edit_recommended_sale_price" name="recommended_sale_price" type="number" min="0.01" step="0.01" defaultValue={device.recommended_sale_price ?? ""} placeholder="Opsiyonel" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit_imei_1">IMEI 1</Label>
            <Input id="edit_imei_1" name="imei_1" defaultValue={device.imei_1 ?? ""} placeholder="15 haneli IMEI" maxLength={15} />
          </div>
          <CheckboxField id="edit_is_dual_sim" name="is_dual_sim" label="Çift SIM" checked={isDualSim} onChange={setIsDualSim} />
          {isDualSim && (
            <div className="space-y-1">
              <Label htmlFor="edit_imei_2">IMEI 2</Label>
              <Input id="edit_imei_2" name="imei_2" defaultValue={device.imei_2 ?? ""} placeholder="15 haneli IMEI (opsiyonel)" maxLength={15} />
            </div>
          )}
          <CheckboxField id="edit_is_new" name="is_new" label="Sıfır cihaz" checked={isNew} onChange={handleIsNewChange} />
          <CheckboxField id="edit_is_foreign" name="is_foreign" label="Yabancı menşei" checked={isForeign} onChange={setIsForeign} />
          <CheckboxField id="edit_has_box" name="has_box" label="Kutu var" checked={hasBox} onChange={setHasBox} />
          <CheckboxField id="edit_has_invoice" name="has_invoice" label="Fatura var" checked={hasInvoice} onChange={setHasInvoice} />
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit_warranty_months">Garanti (ay)</Label>
              <Input
                id="edit_warranty_months" name="warranty_months" type="number" min="0"
                value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit_battery_health">Pil Durumu (%)</Label>
              <Input
                id="edit_battery_health" name="battery_health" type="number" min="0" max="100"
                placeholder={isNew ? "100 (otomatik)" : "0-100"}
                disabled={isNew}
                defaultValue={device.battery_health ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit_barcode">Barkod</Label>
              <Input id="edit_barcode" name="barcode" defaultValue={device.barcode ?? ""} placeholder="Opsiyonel" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function DevicesClient({
  devices,
  brands,
  models,
  activeBrand,
  activeCondition,
  activeForeign,
  activeQ,
}: DevicesClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [optimisticDevices, dispatchOptimistic] = useOptimistic(
    devices,
    (state: InStockDevice[], action:
      | { type: "add"; item: InStockDevice }
      | { type: "update"; item: Partial<InStockDevice> & { device_id: string } }
      | { type: "delete"; device_id: string }
    ) => {
      if (action.type === "add") return [action.item, ...state]
      if (action.type === "update") return state.map(d =>
        d.device_id === action.item.device_id ? { ...d, ...action.item } : d
      )
      if (action.type === "delete") return state.filter(d => d.device_id !== action.device_id)
      return state
    }
  )

  const [localQ, setLocalQ] = useState(activeQ)

  const [addOpen, setAddOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editDevice, setEditDevice] = useState<InStockDevice | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InStockDevice | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function buildParams(overrides: Record<string, string | null>) {
    const params = new URLSearchParams()
    const current: Record<string, string | null> = {
      brand: activeBrand || null,
      condition: activeCondition || null,
      foreign: activeForeign ? "true" : null,
      q: activeQ || null,
    }
    const merged = { ...current, ...overrides }
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    return params.toString()
  }

  function navigate(overrides: Record<string, string | null>) {
    const qs = buildParams(overrides)
    router.push(`/devices${qs ? `?${qs}` : ""}`)
  }

  const handleQChange = useCallback((value: string) => {
    setLocalQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({ q: value || null })
    }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand, activeCondition, activeForeign, activeQ])

  const hasFilters = activeBrand || activeCondition || activeForeign || activeQ

  async function handleAdd(formData: FormData) {
    setAddError(null)
    const brandId = formData.get("brand_id") as string
    const modelId = formData.get("model_id") as string
    const brand = brands.find((b) => b.id === brandId)
    const model = models.find((m) => m.id === modelId)

    const optimisticItem: InStockDevice = {
      device_id: `temp-${Date.now()}`,
      brand: brand?.name ?? "",
      model: model?.name ?? "",
      color: (formData.get("color") as string) ?? "",
      storage: (formData.get("storage") as string) ?? "",
      imei_1: (formData.get("imei_1") as string) || null,
      imei_2: (formData.get("imei_2") as string) || null,
      is_new: formData.get("is_new") === "true",
      is_foreign: formData.get("is_foreign") === "true",
      is_dual_sim: formData.get("is_dual_sim") === "true",
      has_box: formData.get("has_box") === "true",
      has_invoice: formData.get("has_invoice") === "true",
      warranty_months: parseInt(formData.get("warranty_months") as string) || 0,
      barcode: (formData.get("barcode") as string) || null,
      battery_health: formData.get("is_new") === "true" ? 100 : (parseInt(formData.get("battery_health") as string) || null),
      status: "IN_STOCK",
      purchase_price: parseFloat(formData.get("purchase_price") as string) || 0,
      total_expenses: 0,
      net_cost_to_us: parseFloat(formData.get("purchase_price") as string) || 0,
      recommended_sale_price: formData.get("recommended_sale_price")
        ? parseFloat(formData.get("recommended_sale_price") as string)
        : null,
    }

    startTransition(() => {
      dispatchOptimistic({ type: "add", item: optimisticItem })
    })

    const result = await addDevice(formData)
    if ("error" in result) {
      setAddError(result.error)
      return
    }

    setAddOpen(false)
    router.refresh()
  }

  async function handleEdit(deviceId: string, formData: FormData) {
    setEditError(null)
    startTransition(() => {
      dispatchOptimistic({
        type: "update",
        item: {
          device_id: deviceId,
          purchase_price: parseFloat(formData.get("purchase_price") as string) || 0,
          recommended_sale_price: formData.get("recommended_sale_price")
            ? parseFloat(formData.get("recommended_sale_price") as string)
            : null,
          is_new: formData.get("is_new") === "true",
          is_foreign: formData.get("is_foreign") === "true",
        }
      })
    })
    const result = await updateDevice(deviceId, formData)
    if ("error" in result) {
      setEditError(result.error)
      return
    }
    setEditOpen(false)
    router.refresh()
  }

  function openEdit(e: React.MouseEvent, device: InStockDevice) {
    e.stopPropagation()
    setEditError(null)
    setEditDevice(device)
    setEditOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    startTransition(() => {
      dispatchOptimistic({ type: "delete", device_id: deleteTarget.device_id })
    })
    const result = await deleteDevice(deleteTarget.device_id)
    if ("error" in result) {
      setDeleteError(result.error)
      return
    }
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Text search */}
        <Input
          placeholder="Marka, model, renk, IMEI ara..."
          value={localQ}
          onChange={(e) => handleQChange(e.target.value)}
          className="w-64"
        />

        {/* Brand dropdown */}
        <select
          value={activeBrand}
          onChange={(e) => navigate({ brand: e.target.value || null })}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Tüm Markalar</option>
          {brands.map((b) => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </select>

        {/* Condition buttons */}
        <div className="flex items-center gap-1">
          {[
            { value: "", label: "Tümü" },
            { value: "new", label: "Sıfır" },
            { value: "used", label: "İkinci El" },
          ].map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={activeCondition === value ? "default" : "outline"}
              onClick={() => navigate({ condition: value || null })}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Foreign toggle */}
        <Button
          size="sm"
          variant={activeForeign ? "default" : "outline"}
          onClick={() => navigate({ foreign: activeForeign ? null : "true" })}
        >
          Yabancı Menşei
        </Button>

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setLocalQ(""); router.push("/devices") }}
          >
            Filtreleri Temizle
          </Button>
        )}

        <div className="ml-auto">
          <Button size="sm" onClick={() => { setAddError(null); setAddOpen(true) }}>
            + Yeni Cihaz Ekle
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Marka / Model</TableHead>
            <TableHead>Renk / Hafıza</TableHead>
            <TableHead>IMEI</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Pil</TableHead>
            <TableHead>Alış Fiyatı</TableHead>
            <TableHead>Vitrin Fiyatı</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticDevices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {hasFilters ? "Filtreye uyan cihaz bulunamadı." : "Henüz cihaz eklenmemiş."}
              </TableCell>
            </TableRow>
          ) : (
            optimisticDevices.map((device) => (
              <TableRow
                key={device.device_id}
                className={`cursor-pointer hover:bg-muted/50 ${device.device_id.startsWith("temp-") ? "opacity-60" : ""}`}
                onClick={() => {
                  if (!device.device_id.startsWith("temp-")) {
                    router.push(`/devices/${device.device_id}`)
                  }
                }}
              >
                <TableCell className="font-medium">{device.brand} {device.model}</TableCell>
                <TableCell>{device.color} / {device.storage}</TableCell>
                <TableCell className="font-mono text-sm">{device.imei_1 ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {device.is_new && <Badge variant="default" className="text-xs">Sıfır</Badge>}
                    {device.is_foreign && <Badge variant="outline" className="text-xs">Yabancı</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <BatteryBadge value={device.battery_health} />
                </TableCell>
                <TableCell>{formatPrice(device.purchase_price)}</TableCell>
                <TableCell>{formatPrice(device.recommended_sale_price)}</TableCell>
                <TableCell>
                  {!device.device_id.startsWith("temp-") && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={(e) => openEdit(e, device)}>
                        Düzenle
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteTarget(device) }}
                      >
                        Sil
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddDeviceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        brands={brands}
        models={models}
        onAdd={handleAdd}
        error={addError}
      />
      <EditDeviceDialog
        device={editDevice}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEdit}
        error={editError}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cihazı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.brand} {deleteTarget?.model}</strong> ({deleteTarget?.color} / {deleteTarget?.storage}) cihazını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
