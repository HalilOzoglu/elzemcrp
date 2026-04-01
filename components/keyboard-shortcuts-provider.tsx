"use client"

import React, { useState, useMemo, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { sellDevice, sellAccessory } from "@/actions/sales"
import { addDevice } from "@/actions/devices"
import { addAccessory } from "@/actions/accessories"
import type {
  InStockDevice,
  Contact,
  Accessory,
  Brand,
  Model,
} from "@/lib/supabase/types"

type ModalKey = "f1" | "f2" | "f3" | "f4" | "f5" | "help"

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price)
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

// ─── F1 Modal — Cihaz Satışı ──────────────────────────────────────────────────

function DeviceInfoPanel({ device }: { device: InStockDevice }) {
  const profit =
    device.recommended_sale_price != null
      ? device.recommended_sale_price - device.net_cost_to_us
      : null

  function Badge({ children, color }: { children: React.ReactNode; color: "green" | "blue" | "orange" | "gray" }) {
    const cls = {
      green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      gray: "bg-secondary text-secondary-foreground",
    }[color]
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
        {children}
      </span>
    )
  }

  function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
      <div className="flex justify-between items-center gap-2">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className={`font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4 text-sm w-64 shrink-0">
      {/* Header */}
      <div>
        <p className="font-semibold text-base leading-tight">{device.brand} {device.model}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{device.color} · {device.storage}</p>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5">
        {device.is_new && <Badge color="green">Sıfır</Badge>}
        {!device.is_new && <Badge color="gray">İkinci El</Badge>}
        {device.is_foreign && <Badge color="blue">Yabancı</Badge>}
        {device.is_dual_sim && <Badge color="orange">Çift SIM</Badge>}
      </div>

      {/* Physical details */}
      <div className="space-y-1.5 border-t border-border pt-3">
        <Row label="Kutu" value={device.has_box ? "✓ Var" : "✗ Yok"} />
        <Row label="Fatura" value={device.has_invoice ? "✓ Var" : "✗ Yok"} />
        <Row label="Garanti" value={device.warranty_months ? `${device.warranty_months} ay` : "—"} />
        {device.battery_health != null && (
          <Row
            label="Pil Durumu"
            value={
              <span className={
                device.battery_health >= 80 ? "text-green-600 font-semibold" :
                device.battery_health >= 50 ? "text-yellow-600 font-semibold" :
                "text-destructive font-semibold"
              }>
                {device.battery_health}%
              </span>
            }
          />
        )}
        {device.barcode && <Row label="Barkod" value={device.barcode} mono />}
      </div>

      {/* IMEI */}
      {(device.imei_1 || device.imei_2) && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {device.imei_1 && <Row label="IMEI 1" value={device.imei_1} mono />}
          {device.imei_2 && <Row label="IMEI 2" value={device.imei_2} mono />}
        </div>
      )}

      {/* Financials */}
      <div className="space-y-1.5 border-t border-border pt-3">
        <Row label="Alış Fiyatı" value={formatPrice(device.purchase_price)} />
        {device.total_expenses > 0 && (
          <Row label="Masraflar" value={<span className="text-orange-600">+{formatPrice(device.total_expenses)}</span>} />
        )}
        <Row label="Net Maliyet" value={<span className="font-semibold">{formatPrice(device.net_cost_to_us)}</span>} />
        {device.recommended_sale_price != null && (
          <Row label="Vitrin Fiyatı" value={formatPrice(device.recommended_sale_price)} />
        )}
      </div>

      {/* Expected profit */}
      {profit != null && (
        <div className={`rounded-lg px-3 py-2 border flex justify-between items-center ${profit >= 0 ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20" : "border-destructive/30 bg-destructive/5"}`}>
          <span className="font-medium text-sm">Beklenen Kar</span>
          <span className={`font-bold ${profit >= 0 ? "text-green-600" : "text-destructive"}`}>
            {formatPrice(profit)}
          </span>
        </div>
      )}
    </div>
  )
}

function F1Modal({ open, onClose, preselectedDeviceId }: { open: boolean; onClose: () => void; preselectedDeviceId?: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<InStockDevice[]>([])
  const [contacts, setContacts] = useState<Pick<Contact, "id" | "full_name" | "contact_type">[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelectedDeviceId("")
    const supabase = createClient()
    Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("v_in_stock_devices").select("*").order("brand"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("contacts").select("id, full_name, contact_type").order("full_name"),
    ]).then(([devRes, conRes]) => {
      setDevices(devRes.data ?? [])
      setContacts(conRes.data ?? [])
      setLoading(false)
      // Barkoddan gelindiyse pre-select
      if (preselectedDeviceId) {
        setSelectedDeviceId(preselectedDeviceId)
      }
    })
  }, [open, preselectedDeviceId])

  const grouped = useMemo(() => {
    return devices.reduce<Record<string, InStockDevice[]>>((acc, d) => {
      if (!acc[d.brand]) acc[d.brand] = []
      acc[d.brand].push(d)
      return acc
    }, {})
  }, [devices])

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId) ?? null

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await sellDevice(formData)
      if ("error" in result) { setError(result.error); return }
      toast.success("Satış tamamlandı")
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* Wider dialog when a device is selected */}
      <DialogContent className={`max-h-[90vh] overflow-y-auto transition-all duration-200 ${selectedDevice ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <DialogHeader>
          <DialogTitle>F1 — Cihaz Satışı</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Yükleniyor...</p>
        ) : (
          <div className={`flex gap-6 ${selectedDevice ? "flex-row items-start" : ""}`}>
            {/* Form */}
            <form action={handleSubmit} className="space-y-4 mt-2 flex-1 min-w-0">
              <div className="space-y-1">
                <Label htmlFor="f1m_device_id">Cihaz *</Label>
                <select
                  id="f1m_device_id"
                  name="device_id"
                  required
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Cihaz seçin...</option>
                  {Object.entries(grouped).map(([brand, brandDevices]) => (
                    <optgroup key={brand} label={brand}>
                      {brandDevices.map((d) => (
                        <option key={d.device_id} value={d.device_id}>
                          {d.model} — {d.color} / {d.storage}
                          {d.recommended_sale_price ? ` (Vitrin: ${formatPrice(d.recommended_sale_price)})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f1m_sale_price">Satış Fiyatı (₺) *</Label>
                <Input
                  id="f1m_sale_price"
                  name="sale_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={selectedDevice?.recommended_sale_price ? String(selectedDevice.recommended_sale_price) : "0.00"}
                  defaultValue={selectedDevice?.recommended_sale_price ?? ""}
                  key={selectedDeviceId} // reset when device changes
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f1m_payment_method">Ödeme Yöntemi</Label>
                <select id="f1m_payment_method" name="payment_method"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Seçiniz (opsiyonel)</option>
                  <option value="CASH">Nakit</option>
                  <option value="CREDIT_CARD">Kredi Kartı</option>
                  <option value="IBAN">IBAN</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f1m_invoice_type">Fatura Tipi</Label>
                <select id="f1m_invoice_type" name="invoice_type"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Seçiniz (opsiyonel)</option>
                  <option value="AF">Ada Fatura (AF)</option>
                  <option value="MF">Müşteri Faturası (MF)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f1m_contact_id">Müşteri Carisi</Label>
                <select id="f1m_contact_id" name="contact_id"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Perakende (cari seçilmedi)</option>
                  {contacts.filter((c) => c.contact_type === "CUSTOMER").map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "İşleniyor..." : "Satışı Tamamla"}</Button>
              </DialogFooter>
            </form>

            {/* Device info panel — shown when a device is selected */}
            {selectedDevice && (
              <div className="mt-2 w-64 shrink-0">
                <DeviceInfoPanel device={selectedDevice} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── F2 Modal — Cihaz Alışı ───────────────────────────────────────────────────

function F2Modal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [suppliers, setSuppliers] = useState<Pick<Contact, "id" | "full_name">[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedBrandId, setSelectedBrandId] = useState("")
  const [selectedModelId, setSelectedModelId] = useState("")
  const [isDualSim, setIsDualSim] = useState(false)
  const [isNew, setIsNew] = useState<boolean | null>(null)
  const [isForeign, setIsForeign] = useState(false)
  const [hasBox, setHasBox] = useState(false)
  const [hasInvoice, setHasInvoice] = useState(false)
  const [warrantyMonths, setWarrantyMonths] = useState("0")
  const [colorOptions, setColorOptions] = useState<string[]>([])
  const [storageOptions, setStorageOptions] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const supabase = createClient()
    Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("brands").select("*").order("name"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("models").select("*").order("name"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("contacts").select("id, full_name").order("full_name"),
    ]).then(([bRes, mRes, sRes]) => {
      setBrands(bRes.data ?? [])
      setModels(mRes.data ?? [])
      setSuppliers(sRes.data ?? [])
      setLoading(false)
    })
  }, [open])

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

  function handleClose() {
    setSelectedBrandId(""); setSelectedModelId("")
    setIsDualSim(false); setIsNew(null); setIsForeign(false)
    setHasBox(false); setHasInvoice(false); setWarrantyMonths("0")
    setColorOptions([]); setStorageOptions([])
    setError(null)
    onClose()
  }

  const filteredModels = models.filter((m) => m.brand_id === selectedBrandId)

  async function handleSubmit(formData: FormData) {
    if (isNew === null) { setError("Cihaz durumu seçiniz (Sıfır / İkinci El)"); return }
    setError(null)
    formData.set("is_dual_sim", isDualSim ? "true" : "false")
    formData.set("is_new", isNew ? "true" : "false")
    formData.set("is_foreign", isForeign ? "true" : "false")
    formData.set("has_box", hasBox ? "true" : "false")
    formData.set("has_invoice", hasInvoice ? "true" : "false")
    formData.set("warranty_months", warrantyMonths)
    startTransition(async () => {
      const result = await addDevice(formData)
      if ("error" in result) { setError(result.error); return }
      toast.success("Cihaz başarıyla eklendi")
      handleClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>F2 — Cihaz Alışı</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Yükleniyor...</p>
        ) : (
          <form action={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="f2m_brand_id">Marka *</Label>
              <select id="f2m_brand_id" name="brand_id" required value={selectedBrandId}
                onChange={(e) => { setSelectedBrandId(e.target.value); setSelectedModelId("") }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Marka seçin...</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f2m_model_id">Model *</Label>
              <select id="f2m_model_id" name="model_id" required disabled={!selectedBrandId}
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                <option value="">Model seçin...</option>
                {filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="f2m_color">Renk *</Label>
                <Input id="f2m_color" name="color" placeholder="Siyah" required list="f2m_color_list" />
                <datalist id="f2m_color_list">
                  {colorOptions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f2m_storage">Hafıza *</Label>
                <Input id="f2m_storage" name="storage" placeholder="128GB" required list="f2m_storage_list" />
                <datalist id="f2m_storage_list">
                  {storageOptions.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Cihaz Durumu *</Label>
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => handleIsNewChange(true)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${isNew === true ? "bg-primary text-primary-foreground border-primary" : "border-input bg-background hover:bg-muted"}`}>
                  Sıfır
                </button>
                <button type="button"
                  onClick={() => handleIsNewChange(false)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${isNew === false ? "bg-primary text-primary-foreground border-primary" : "border-input bg-background hover:bg-muted"}`}>
                  İkinci El
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f2m_supplier_id">Tedarikçi / Alınan Kişi</Label>
              <select id="f2m_supplier_id" name="supplier_id"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Perakende (cari seçilmedi)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <CheckboxField id="f2m_is_dual_sim" name="is_dual_sim" label="Çift SIM" checked={isDualSim} onChange={setIsDualSim} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="f2m_purchase_price">Alış Fiyatı (₺) *</Label>
                <Input id="f2m_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f2m_recommended_sale_price">Vitrin Fiyatı (₺)</Label>
                <Input id="f2m_recommended_sale_price" name="recommended_sale_price" type="number" min="0.01" step="0.01" placeholder="Opsiyonel" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f2m_imei_1">IMEI 1</Label>
              <Input id="f2m_imei_1" name="imei_1" placeholder="15 haneli IMEI (opsiyonel)" maxLength={15} />
            </div>
            {isDualSim && (
              <div className="space-y-1">
                <Label htmlFor="f2m_imei_2">IMEI 2</Label>
                <Input id="f2m_imei_2" name="imei_2" placeholder="15 haneli IMEI (opsiyonel)" maxLength={15} />
              </div>
            )}
            <CheckboxField id="f2m_is_foreign" name="is_foreign" label="Yabancı menşei" checked={isForeign} onChange={setIsForeign} />
            <CheckboxField id="f2m_has_box" name="has_box" label="Kutu var" checked={hasBox} onChange={setHasBox} />
            <CheckboxField id="f2m_has_invoice" name="has_invoice" label="Fatura var" checked={hasInvoice} onChange={setHasInvoice} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="f2m_warranty_months">Garanti (ay)</Label>
                <Input
                  id="f2m_warranty_months" name="warranty_months" type="number" min="0"
                  value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f2m_battery_health">Pil Durumu (%)</Label>
                <Input
                  id="f2m_battery_health" name="battery_health" type="number" min="0" max="100"
                  placeholder={isNew === true ? "100 (otomatik)" : "0-100"}
                  disabled={isNew === true}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f2m_barcode">Barkod</Label>
              <Input id="f2m_barcode" name="barcode" placeholder="Otomatik atanacak" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>İptal</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Ekleniyor..." : "Cihaz Ekle"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── F3 Modal — Aksesuar Alışı ────────────────────────────────────────────────

function F3Modal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await addAccessory(formData)
      if ("error" in result) { setError(result.error); return }
      toast.success("Aksesuar başarıyla eklendi")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>F3 — Aksesuar Alışı</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="f3m_barcode">Barkod</Label>
            <Input id="f3m_barcode" name="barcode" placeholder="Otomatik atanacak" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f3m_brand">Marka</Label>
            <Input id="f3m_brand" name="brand" placeholder="Marka (opsiyonel)" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f3m_category">Kategori</Label>
            <Input id="f3m_category" name="category" placeholder="Kategori (opsiyonel)" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f3m_stock_quantity">Stok Adedi *</Label>
            <Input id="f3m_stock_quantity" name="stock_quantity" type="number" min="0" step="1" placeholder="0" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="f3m_purchase_price">Alış Fiyatı (₺) *</Label>
              <Input id="f3m_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f3m_sale_price">Satış Fiyatı (₺) *</Label>
              <Input id="f3m_sale_price" name="sale_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Ekleniyor..." : "Aksesuar Ekle"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── F4 Modal — Aksesuar Satışı ───────────────────────────────────────────────

function F4Modal({ open, onClose, preselectedBarcode }: { open: boolean; onClose: () => void; preselectedBarcode?: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [accessories, setAccessories] = useState<Pick<Accessory, "id" | "barcode" | "brand" | "category" | "stock_quantity" | "sale_price">[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from("accessories")
      .select("id, barcode, brand, category, stock_quantity, sale_price")
      .gt("stock_quantity", 0)
      .order("barcode")
      .then(({ data }: { data: Pick<Accessory, "id" | "barcode" | "brand" | "category" | "stock_quantity" | "sale_price">[] | null }) => {
        setAccessories(data ?? [])
        setLoading(false)
      })
  }, [open])

  // Pre-select barcode from F5
  const [selectedBarcode, setSelectedBarcode] = useState("")
  useEffect(() => {
    if (open && preselectedBarcode) setSelectedBarcode(preselectedBarcode)
    if (!open) setSelectedBarcode("")
  }, [open, preselectedBarcode])

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await sellAccessory(formData)
      if ("error" in result) { setError(result.error); return }
      toast.success("Aksesuar satışı tamamlandı")
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>F4 — Aksesuar Satışı</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Yükleniyor...</p>
        ) : (
          <form action={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="f4m_accessory_barcode">Aksesuar *</Label>
              <select id="f4m_accessory_barcode" name="accessory_barcode" required
                value={selectedBarcode}
                onChange={(e) => setSelectedBarcode(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Aksesuar seçin...</option>
                {accessories.map((a) => (
                  <option key={a.barcode} value={a.barcode}>
                    {a.barcode} — {[a.brand, a.category].filter(Boolean).join(" / ") || "—"} (Stok: {a.stock_quantity})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f4m_quantity">Adet *</Label>
              <Input id="f4m_quantity" name="quantity" type="number" min="1" step="1" defaultValue="1" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "İşleniyor..." : "Satışı Tamamla"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Help + Provider ──────────────────────────────────────────────────────────

// ─── F5 Modal — Barkod Okuyucu ────────────────────────────────────────────────

type BarcodeResult =
  | { type: "device"; data: Record<string, unknown> }
  | { type: "accessory"; data: Record<string, unknown> }
  | null

function F5Modal({
  open,
  onClose,
  onOpenF1,
  onOpenF4,
}: {
  open: boolean
  onClose: () => void
  onOpenF1: (deviceId: string) => void
  onOpenF4: (barcode: string) => void
}) {
  const [barcodeInput, setBarcodeInput] = useState("")
  const [result, setResult] = useState<BarcodeResult>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setBarcodeInput("")
      setResult(null)
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function lookup(code: string) {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code.trim())}`)
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? "Barkod bulunamadı")
      } else {
        const body = await res.json()
        setResult(body)
      }
    } catch {
      setError("Bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      lookup(barcodeInput)
    }
  }

  function formatPrice(v: number) {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(v)
  }

  function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="flex justify-between items-center gap-2 text-sm">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className="font-medium text-right">{value}</span>
      </div>
    )
  }

  const deviceData = result?.type === "device" ? result.data : null
  const accessoryData = result?.type === "accessory" ? result.data : null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>F5 — Barkod Okuyucu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Barkod okutun veya yazın..."
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
            <Button
              size="sm"
              onClick={() => lookup(barcodeInput)}
              disabled={loading || !barcodeInput.trim()}
            >
              {loading ? "..." : "Ara"}
            </Button>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Device result */}
          {deviceData && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">
                    {String(deviceData.brand)} {String(deviceData.model)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {String(deviceData.color)} · {String(deviceData.storage)}
                  </p>
                </div>
                <span className="rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-medium">
                  Cihaz
                </span>
              </div>

              <div className="space-y-1.5 border-t border-border pt-3">
                <Row label="Durum" value={deviceData.is_new ? "Sıfır" : "İkinci El"} />
                <Row label="Kutu" value={deviceData.has_box ? "✓ Var" : "✗ Yok"} />
                <Row label="Fatura" value={deviceData.has_invoice ? "✓ Var" : "✗ Yok"} />
                {deviceData.warranty_months ? <Row label="Garanti" value={`${deviceData.warranty_months} ay`} /> : null}
                {deviceData.battery_health != null ? (
                  <Row label="Pil" value={
                    <span className={
                      Number(deviceData.battery_health) >= 80 ? "text-green-600 font-semibold" :
                      Number(deviceData.battery_health) >= 50 ? "text-yellow-600 font-semibold" :
                      "text-destructive font-semibold"
                    }>{String(deviceData.battery_health)}%</span>
                  } />
                ) : null}
                {deviceData.imei_1 ? <Row label="IMEI 1" value={<span className="font-mono text-xs">{String(deviceData.imei_1)}</span>} /> : null}
              </div>

              <div className="space-y-1.5 border-t border-border pt-3">
                <Row label="Alış Fiyatı" value={formatPrice(Number(deviceData.purchase_price))} />
                {Number(deviceData.total_expenses) > 0 && (
                  <Row label="Masraflar" value={<span className="text-orange-600">+{formatPrice(Number(deviceData.total_expenses))}</span>} />
                )}
                <Row label="Net Maliyet" value={<span className="font-semibold">{formatPrice(Number(deviceData.net_cost_to_us))}</span>} />
                {deviceData.recommended_sale_price != null && (
                  <Row label="Vitrin Fiyatı" value={formatPrice(Number(deviceData.recommended_sale_price))} />
                )}
              </div>

              <Button
                className="w-full mt-2"
                onClick={() => {
                  onClose()
                  onOpenF1(String(deviceData.device_id))
                }}
              >
                Bu Cihazı Sat (F1)
              </Button>
            </div>
          )}

          {/* Accessory result */}
          {accessoryData && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">
                    {[accessoryData.brand, accessoryData.category].filter(Boolean).join(" / ") || "Aksesuar"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{String(accessoryData.barcode)}</p>
                </div>
                <span className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 text-xs font-medium">
                  Aksesuar
                </span>
              </div>

              <div className="space-y-1.5 border-t border-border pt-3">
                <Row label="Stok" value={`${accessoryData.stock_quantity} adet`} />
                <Row label="Alış Fiyatı" value={formatPrice(Number(accessoryData.purchase_price))} />
                <Row label="Satış Fiyatı" value={<span className="font-semibold">{formatPrice(Number(accessoryData.sale_price))}</span>} />
              </div>

              <Button
                className="w-full mt-2"
                disabled={Number(accessoryData.stock_quantity) === 0}
                onClick={() => {
                  onClose()
                  onOpenF4(String(accessoryData.barcode))
                }}
              >
                {Number(accessoryData.stock_quantity) === 0 ? "Stok Yok" : "Bu Aksesuarı Sat (F4)"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const SHORTCUTS = [
  { key: "N / F1", label: "F1 Cihaz Satışı (modal)" },
  { key: "F2", label: "F2 Cihaz Alışı (modal)" },
  { key: "F3", label: "F3 Aksesuar Alışı (modal)" },
  { key: "F4", label: "F4 Aksesuar Satışı (modal)" },
  { key: "F5", label: "F5 Barkod Okuyucu (modal)" },
  { key: "D", label: "Cihazlar sayfası" },
  { key: "A", label: "Aksesuarlar sayfası" },
  { key: "?", label: "Bu yardım" },
]

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [openModal, setOpenModal] = useState<ModalKey | null>(null)
  // F1'i barkoddan açarken pre-select için device id
  const [f1PreselectedDeviceId, setF1PreselectedDeviceId] = useState<string | null>(null)
  // F4'ü barkoddan açarken pre-select için barcode
  const [f4PreselectedBarcode, setF4PreselectedBarcode] = useState<string | null>(null)

  const shortcuts = useMemo(
    () => ({
      n: () => setOpenModal("f1"),
      N: () => setOpenModal("f1"),
      d: () => router.push("/devices"),
      D: () => router.push("/devices"),
      a: () => router.push("/accessories"),
      A: () => router.push("/accessories"),
      "?": () => setOpenModal("help"),
      F1: () => setOpenModal("f1"),
      F2: () => setOpenModal("f2"),
      F3: () => setOpenModal("f3"),
      F4: () => setOpenModal("f4"),
      F5: () => setOpenModal("f5"),
    }),
    [router]
  )

  useKeyboardShortcuts(shortcuts)

  function close() {
    setOpenModal(null)
    setF1PreselectedDeviceId(null)
    setF4PreselectedBarcode(null)
  }

  function openF1FromBarcode(deviceId: string) {
    setF1PreselectedDeviceId(deviceId)
    setOpenModal("f1")
  }

  function openF4FromBarcode(barcode: string) {
    setF4PreselectedBarcode(barcode)
    setOpenModal("f4")
  }

  return (
    <>
      {children}
      <F1Modal open={openModal === "f1"} onClose={close} preselectedDeviceId={f1PreselectedDeviceId} />
      <F2Modal open={openModal === "f2"} onClose={close} />
      <F3Modal open={openModal === "f3"} onClose={close} />
      <F4Modal open={openModal === "f4"} onClose={close} preselectedBarcode={f4PreselectedBarcode} />
      <F5Modal
        open={openModal === "f5"}
        onClose={close}
        onOpenF1={openF1FromBarcode}
        onOpenF4={openF4FromBarcode}
      />
      <Dialog open={openModal === "help"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klavye Kısayolları</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {SHORTCUTS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">{label}</span>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
