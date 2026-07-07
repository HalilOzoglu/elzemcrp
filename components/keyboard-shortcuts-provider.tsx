"use client"

import React, { useState, useMemo, useEffect, useTransition, useRef } from "react"
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

// Sunucuyu yormamak ve "fetch failed" hatalarını engellemek için eklendi
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

// ─── F1 Modal — Cihaz Satışı (Çoklu Satış Destekli) ──────────────────────────

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
      <div>
        <p className="font-semibold text-base leading-tight">{device.brand} {device.model}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{device.color} · {device.storage}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {device.is_new && <Badge color="green">Sıfır</Badge>}
        {!device.is_new && <Badge color="gray">İkinci El</Badge>}
        {device.is_foreign && <Badge color="blue">Yabancı</Badge>}
        {device.is_dual_sim && <Badge color="orange">Çift SIM</Badge>}
      </div>

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

      {(device.imei_1 || device.imei_2) && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {device.imei_1 && <Row label="IMEI 1" value={device.imei_1} mono />}
          {device.imei_2 && <Row label="IMEI 2" value={device.imei_2} mono />}
        </div>
      )}

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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<InStockDevice[]>([])
  const [contacts, setContacts] = useState<Pick<Contact, "id" | "full_name" | "contact_type">[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedDeviceId, setSelectedDeviceId] = useState("")
  const [salePriceInput, setSalePriceInput] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [invoiceType, setInvoiceType] = useState("")
  const [contactId, setContactId] = useState("")
  const [cart, setCart] = useState<{ device: InStockDevice; price: number }[]>([])

  useEffect(() => {
    if (!open) {
      setCart([]); setPaymentMethod(""); setInvoiceType(""); setContactId(""); setSalePriceInput("");
      return
    }
    setLoading(true)
    setSelectedDeviceId("")
    const supabase = createClient()
    Promise.all([
      (supabase as any).from("v_in_stock_devices").select("*").order("brand"),
      (supabase as any).from("contacts").select("id, full_name, contact_type").order("full_name"),
    ]).then(([devRes, conRes]) => {
      setDevices(devRes.data ?? [])
      setContacts(conRes.data ?? [])
      setLoading(false)
      if (preselectedDeviceId) setSelectedDeviceId(preselectedDeviceId)
    })
  }, [open, preselectedDeviceId])

  const grouped = useMemo(() => {
    const sortedDevices = [...devices].sort((a, b) => {
      const modelCompare = a.model.localeCompare(b.model)
      if (modelCompare !== 0) return modelCompare
      return a.color.localeCompare(b.color)
    })
    return sortedDevices.reduce<Record<string, InStockDevice[]>>((acc, d) => {
      if (!acc[d.brand]) acc[d.brand] = []
      acc[d.brand].push(d)
      return acc
    }, {})
  }, [devices])

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId) ?? null

  useEffect(() => {
    if (selectedDevice?.recommended_sale_price) {
      setSalePriceInput(String(selectedDevice.recommended_sale_price))
    } else {
      setSalePriceInput("")
    }
  }, [selectedDevice])

  function handleAddToCart() {
    if (!selectedDevice) return
    const p = parseFloat(salePriceInput)
    if (isNaN(p) || p <= 0) { setError("Geçerli bir satış fiyatı giriniz."); return }

    if (cart.some(c => c.device.device_id === selectedDevice.device_id)) {
      setError("Bu cihaz zaten sepette ekli."); return
    }

    setCart([...cart, { device: selectedDevice, price: p }])
    setSelectedDeviceId("")
    setSalePriceInput("")
    setError(null)
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index))
  }

  async function handleCompleteSale() {
    const itemsToSell = [...cart]
    if (cart.length === 0 && selectedDevice) {
      const p = parseFloat(salePriceInput)
      if (isNaN(p) || p <= 0) { setError("Geçerli bir satış fiyatı giriniz."); return }
      itemsToSell.push({ device: selectedDevice, price: p })
    }

    if (itemsToSell.length === 0) { setError("Lütfen satılacak bir cihaz seçin."); return }
    setError(null)
    setIsSubmitting(true)
    setSubmitProgress(0)

    let errorMsg = null
    let successCount = 0
    const totalItems = itemsToSell.length

    for (let i = 0; i < totalItems; i++) {
      const item = itemsToSell[i]
      const fd = new FormData()
      fd.append("device_id", item.device.device_id)
      fd.append("sale_price", String(item.price))
      if (paymentMethod) fd.append("payment_method", paymentMethod)
      if (invoiceType) fd.append("invoice_type", invoiceType)
      if (contactId) fd.append("contact_id", contactId)

      try {
        const result = await sellDevice(fd)
        if (result && "error" in result) {
          errorMsg = `${item.device.model} satılamadı: ${result.error}`
          break
        }
        successCount++
        setSubmitProgress(i + 1)

        // Fetch failed hatasını önlemek için küçük bekleme
        if (i < totalItems - 1) await delay(300);
      } catch (err) {
        errorMsg = `${item.device.model} işleminde bağlantı hatası oluştu.`
        break
      }
    }

    setIsSubmitting(false)

    if (errorMsg) {
      setError(errorMsg)
      if (cart.length > 0) setCart(cart.slice(successCount))
      if (successCount > 0) {
        toast.success(`${successCount} adet cihaz satıldı, ardından hata oluştu.`)
        startTransition(() => router.refresh())
      }
    } else {
      toast.success(`${successCount} adet cihaz satışı tamamlandı`)
      onClose()
      startTransition(() => router.refresh())
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto transition-all duration-200 ${(selectedDevice || cart.length > 0) ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
        <DialogHeader>
          <DialogTitle>F1 — Cihaz Satışı {cart.length > 0 && `(Sepet: ${cart.length} Cihaz)`}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Yükleniyor...</p>
        ) : (
          <div className={`flex gap-6 ${(selectedDevice || cart.length > 0) ? "flex-row items-start" : ""}`}>
            <form action={handleCompleteSale} className="space-y-5 mt-2 flex-1 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border">
                <div className="space-y-1">
                  <Label htmlFor="f1m_contact_id" className="text-xs">Müşteri Carisi</Label>
                  <select id="f1m_contact_id" value={contactId} onChange={e => setContactId(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Perakende (Cari Yok)</option>
                    {contacts.filter((c) => c.contact_type === "CUSTOMER").map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f1m_payment_method" className="text-xs">Ödeme Yöntemi</Label>
                  <select id="f1m_payment_method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Seçiniz (Opsiyonel)</option>
                    <option value="CASH">Nakit</option>
                    <option value="CREDIT_CARD">Kredi Kartı</option>
                    <option value="IBAN">IBAN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f1m_invoice_type" className="text-xs">Fatura Tipi</Label>
                  <select id="f1m_invoice_type" value={invoiceType} onChange={e => setInvoiceType(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Seçiniz (Opsiyonel)</option>
                    <option value="AF">Ada Fatura (AF)</option>
                    <option value="MF">Müşteri Faturası (MF)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end gap-3 border-b pb-4">
                <div className="flex-1 space-y-1 w-full">
                  <Label htmlFor="f1m_device_id">Cihaz Seçimi</Label>
                  <select id="f1m_device_id" value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Listeden cihaz seçin...</option>
                    {Object.entries(grouped).map(([brand, brandDevices]) => (
                      <optgroup key={brand} label={brand}>
                        {brandDevices.filter(d => !cart.find(c => c.device.device_id === d.device_id)).map((d) => (
                          <option key={d.device_id} value={d.device_id}>
                            {d.model} — {d.color} / {d.storage}
                            {d.battery_health != null ? ` | Pil: %${d.battery_health}` : ""}
                            {d.purchase_price != null ? ` | Alış: ${formatPrice(d.purchase_price)}` : ""}
                            {d.recommended_sale_price ? ` (Vitrin: ${formatPrice(d.recommended_sale_price)})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-28 space-y-1">
                  <Label htmlFor="f1m_sale_price">Fiyat (₺) *</Label>
                  <Input id="f1m_sale_price" type="number" min="0.01" step="0.01" value={salePriceInput} onChange={e => setSalePriceInput(e.target.value)} placeholder="0.00" />
                </div>
                <Button type="button" variant="secondary" onClick={handleAddToCart} disabled={!selectedDeviceId || !salePriceInput || isSubmitting} className="w-full sm:w-auto">
                  Sepete Ekle
                </Button>
              </div>

              {cart.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider">Satılacak Cihazlar ({cart.length})</p>
                  <div className="space-y-1">
                    {cart.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-background rounded-md px-3 py-2 text-sm border shadow-sm">
                        <span className="font-medium">{item.device.brand} {item.device.model} <span className="text-muted-foreground text-xs font-normal">({item.device.color})</span></span>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-green-600">{formatPrice(item.price)}</span>
                          <button type="button" onClick={() => removeFromCart(i)} disabled={isSubmitting} className="text-destructive text-xs hover:underline shrink-0">Sil</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 px-1 border-t border-primary/10">
                    <span className="font-bold text-sm">Toplam Sepet Tutarı</span>
                    <span className="font-bold text-lg text-primary">{formatPrice(cart.reduce((sum, item) => sum + item.price, 0))}</span>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>}

              <DialogFooter className="pt-2 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>İptal</Button>
                <Button type="submit" disabled={isSubmitting || (cart.length === 0 && !selectedDeviceId)}>
                  {isSubmitting
                    ? (cart.length > 1 ? `Satılıyor... (${submitProgress}/${cart.length})` : "İşleniyor...")
                    : cart.length > 0 ? "Sepetteki Tümünü Sat" : "Seçili Cihazı Sat"}
                </Button>
              </DialogFooter>
            </form>

            {selectedDevice && (
              <div className="mt-2 w-64 shrink-0 hidden sm:block">
                <DeviceInfoPanel device={selectedDevice} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── F2 Modal — Cihaz Alışı (Çoklu Alış Destekli & Donma Korumalı) ───────────

function F2Modal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [suppliers, setSuppliers] = useState<Pick<Contact, "id" | "full_name">[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedBrandId, setSelectedBrandId] = useState("")
  const [selectedModelId, setSelectedModelId] = useState("")
  const [quantity, setQuantity] = useState(1)
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
      (supabase as any).from("brands").select("*").order("name"),
      (supabase as any).from("models").select("*").order("name"),
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
      ; (supabase as any)
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
    setQuantity(1); setIsDualSim(false); setIsNew(null); setIsForeign(false)
    setHasBox(false); setHasInvoice(false); setWarrantyMonths("0")
    setColorOptions([]); setStorageOptions([])
    setError(null)
    onClose()
  }

  const filteredModels = models.filter((m) => m.brand_id === selectedBrandId)

  async function handleSubmit(formData: FormData) {
    if (isNew === null) { setError("Cihaz durumu seçiniz (Sıfır / İkinci El)"); return }
    setError(null)
    setIsSubmitting(true)
    setSubmitProgress(0)

    formData.set("is_dual_sim", isDualSim ? "true" : "false")
    formData.set("is_new", isNew ? "true" : "false")
    formData.set("is_foreign", isForeign ? "true" : "false")
    formData.set("has_box", hasBox ? "true" : "false")
    formData.set("has_invoice", hasInvoice ? "true" : "false")
    formData.set("warranty_months", warrantyMonths)

    let errorMsg = null;
    let successCount = 0;

    for (let i = 0; i < quantity; i++) {
      const fd = new FormData();
      Array.from(formData.entries()).forEach(([k, v]) => fd.append(k, v));

      if (quantity > 1) {
        fd.set("imei_1", "");
        fd.set("imei_2", "");
        fd.set("barcode", "");
      }

      try {
        const result = await addDevice(fd)
        if (result && "error" in result) {
          errorMsg = `Kayıt sırası (${i + 1}/${quantity}): ${result.error}`
          break;
        }
        successCount++;
        setSubmitProgress(i + 1);

        if (i < quantity - 1) await delay(300);
      } catch (e) {
        errorMsg = `Kayıt sırası (${i + 1}/${quantity}): Bağlantı hatası oluştu.`
        break;
      }
    }

    setIsSubmitting(false)

    if (errorMsg) {
      setError(errorMsg)
      if (successCount > 0) {
        toast.success(`${successCount} adet cihaz eklendi, ardından işlem durduruldu.`)
        startTransition(() => router.refresh())
      }
    } else {
      toast.success(quantity > 1 ? `${quantity} adet cihaz başarıyla eklendi` : "Cihaz başarıyla eklendi")
      handleClose()
      startTransition(() => router.refresh())
    }
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
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="grid grid-cols-3 gap-3">
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
              <div className="space-y-1 border-l pl-3">
                <Label htmlFor="f2m_quantity" className="text-primary font-semibold">Alım Adedi *</Label>
                <Input id="f2m_quantity" name="quantity" type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} required className="font-bold bg-primary/5 border-primary/30" />
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
                <Label htmlFor="f2m_purchase_price">Birim Alış Fiyatı (₺) *</Label>
                <Input id="f2m_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f2m_recommended_sale_price">Vitrin Fiyatı (₺)</Label>
                <Input id="f2m_recommended_sale_price" name="recommended_sale_price" type="number" min="0.01" step="0.01" placeholder="Opsiyonel" />
              </div>
            </div>

            {quantity > 1 ? (
              <div className="rounded border bg-orange-50/50 dark:bg-orange-900/10 px-3 py-2 text-xs text-orange-600 dark:text-orange-400">
                ⚠️ Çoklu alım ({quantity} adet) seçildiği için IMEI ve özel Barkod girişleri devre dışı bırakıldı. Sistem cihazlara otomatik barkod atayacaktır.
              </div>
            ) : (
              <>
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
                <div className="space-y-1">
                  <Label htmlFor="f2m_barcode">Barkod</Label>
                  <Input id="f2m_barcode" name="barcode" placeholder="Otomatik atanacak" />
                </div>
              </>
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

            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>İptal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? (quantity > 1 ? `Ekleniyor... (${submitProgress}/${quantity})` : "Ekleniyor...")
                  : (quantity > 1 ? `${quantity} Cihazı Ekle` : "Cihaz Ekle")}
              </Button>
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
  const [keepOpen, setKeepOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await addAccessory(formData)
      if ("error" in result) { setError(result.error); return }
      toast.success("Aksesuar başarıyla eklendi")
      if (keepOpen && formRef.current) {
        formRef.current.reset()
      } else {
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>F3 — Aksesuar Alışı</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4 mt-2">
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
            <Input id="f3m_stock_quantity" name="stock_quantity" type="number" min="1" step="1" defaultValue="1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="f3m_purchase_price">Birim Alış Fiyatı (₺) *</Label>
              <Input id="f3m_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f3m_sale_price">Satış Fiyatı (₺) *</Label>
              <Input id="f3m_sale_price" name="sale_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="pt-2 border-t mt-4 flex justify-between items-center">
            <CheckboxField id="f3m_keep_open" name="keepOpen" label="Ardışık ekle (Pencereyi kapatma)" checked={keepOpen} onChange={setKeepOpen} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Ekleniyor..." : "Aksesuar Ekle"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── F4 Modal — Aksesuar Satışı (Çoklu Sepet Destekli) ─────────────────────────

function F4Modal({ open, onClose, preselectedBarcode }: { open: boolean; onClose: () => void; preselectedBarcode?: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [accessories, setAccessories] = useState<Pick<Accessory, "id" | "barcode" | "brand" | "category" | "stock_quantity" | "sale_price">[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedBarcode, setSelectedBarcode] = useState("")
  const [quantityInput, setQuantityInput] = useState("1")
  const [cart, setCart] = useState<{ acc: typeof accessories[0]; qty: number }[]>([])

  useEffect(() => {
    if (!open) {
      setCart([]); setSelectedBarcode(""); setQuantityInput("1")
      return
    }
    setLoading(true)
    const supabase = createClient()
      ; (supabase as any)
        .from("accessories")
        .select("id, barcode, brand, category, stock_quantity, sale_price")
        .gt("stock_quantity", 0)
        .order("barcode")
        .then(({ data }: { data: typeof accessories | null }) => {
          setAccessories(data ?? [])
          setLoading(false)
        })
  }, [open])

  useEffect(() => {
    if (open && preselectedBarcode) setSelectedBarcode(preselectedBarcode)
  }, [open, preselectedBarcode])

  const selectedAccessory = accessories.find(a => a.barcode === selectedBarcode)

  function handleAddToCart() {
    if (!selectedAccessory) return
    const qty = parseInt(quantityInput)
    if (isNaN(qty) || qty <= 0) { setError("Geçerli bir adet giriniz."); return }

    const currentInCart = cart.find(c => c.acc.barcode === selectedBarcode)?.qty || 0
    if (currentInCart + qty > (selectedAccessory.stock_quantity ?? 0)) {
      setError("Stok yetersiz.")
      return
    }

    const existingIdx = cart.findIndex(c => c.acc.barcode === selectedBarcode)
    if (existingIdx >= 0) {
      const newCart = [...cart]
      newCart[existingIdx].qty += qty
      setCart(newCart)
    } else {
      setCart([...cart, { acc: selectedAccessory, qty }])
    }

    setSelectedBarcode("")
    setQuantityInput("1")
    setError(null)
  }

  async function handleCompleteSale() {
    const itemsToSell = [...cart]
    if (cart.length === 0 && selectedAccessory) {
      const qty = parseInt(quantityInput)
      if (isNaN(qty) || qty <= 0) { setError("Geçerli bir adet giriniz."); return }
      itemsToSell.push({ acc: selectedAccessory, qty })
    }

    if (itemsToSell.length === 0) { setError("Satılacak aksesuar seçin."); return }
    setError(null)
    setIsSubmitting(true)
    setSubmitProgress(0)

    let errorMsg = null
    let successCount = 0
    const totalItems = itemsToSell.length

    for (let i = 0; i < totalItems; i++) {
      const item = itemsToSell[i]
      const fd = new FormData()
      fd.append("accessory_barcode", String(item.acc.barcode))
      fd.append("quantity", String(item.qty))

      try {
        const result = await sellAccessory(fd)
        if (result && "error" in result) {
          errorMsg = `${item.acc.barcode} satılamadı: ${result.error}`
          break
        }
        successCount++
        setSubmitProgress(i + 1)

        // Fetch failed hatasını önlemek için küçük bekleme
        if (i < totalItems - 1) await delay(300);
      } catch (err) {
        errorMsg = `${item.acc.barcode} işleminde bağlantı hatası oluştu.`
        break
      }
    }

    setIsSubmitting(false)

    if (errorMsg) {
      setError(errorMsg)
      if (cart.length > 0) setCart(cart.slice(successCount))
      if (successCount > 0) {
        toast.success("Bazı aksesuarlar satıldı ancak ardından hata oluştu.")
        startTransition(() => router.refresh())
      }
    } else {
      toast.success("Aksesuar satışı tamamlandı")
      onClose()
      startTransition(() => router.refresh())
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl transition-all duration-200">
        <DialogHeader>
          <DialogTitle>F4 — Aksesuar Satışı</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Yükleniyor...</p>
        ) : (
          <form action={handleCompleteSale} className="space-y-4 mt-2">
            <div className="flex flex-col sm:flex-row items-end gap-3 pb-4 border-b">
              <div className="flex-1 space-y-1 w-full">
                <Label htmlFor="f4m_accessory_barcode">Aksesuar Seçimi</Label>
                <select id="f4m_accessory_barcode" value={selectedBarcode}
                  onChange={(e) => setSelectedBarcode(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Aksesuar seçin...</option>
                  {accessories.map((a) => (
                    <option key={a.barcode} value={a.barcode}>
                      {a.barcode} — {[a.brand, a.category].filter(Boolean).join(" / ") || "—"} (Stok: {a.stock_quantity}) - {formatPrice(a.sale_price ?? 0)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-20 space-y-1">
                <Label htmlFor="f4m_quantity">Adet *</Label>
                <Input id="f4m_quantity" type="number" min="1" step="1" value={quantityInput} onChange={(e) => setQuantityInput(e.target.value)} />
              </div>
              <Button type="button" variant="secondary" onClick={handleAddToCart} disabled={!selectedBarcode || !quantityInput || isSubmitting} className="w-full sm:w-auto">
                Sepete Ekle
              </Button>
            </div>

            {cart.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider">Satılacak Aksesuarlar ({cart.length})</p>
                <div className="space-y-1">
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-background rounded-md px-3 py-2 text-sm border shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{[item.acc.brand, item.acc.category].filter(Boolean).join(" / ") || "Aksesuar"}</span>
                        <span className="text-xs text-muted-foreground font-mono">{item.acc.barcode}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{item.qty} adet</span>
                        <span className="font-semibold text-green-600">{formatPrice((item.acc.sale_price ?? 0) * item.qty)}</span>
                        <button type="button" onClick={() => setCart(cart.filter((_, idx) => idx !== i))} disabled={isSubmitting} className="text-destructive text-xs hover:underline shrink-0">Sil</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 px-1 border-t border-primary/10">
                  <span className="font-bold text-sm">Toplam Tutar</span>
                  <span className="font-bold text-lg text-primary">{formatPrice(cart.reduce((sum, item) => sum + (item.acc.sale_price ?? 0) * item.qty, 0))}</span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>İptal</Button>
              <Button type="submit" disabled={isSubmitting || (cart.length === 0 && !selectedBarcode)}>
                {isSubmitting
                  ? (cart.length > 1 ? `Satılıyor... (${submitProgress}/${cart.length})` : "İşleniyor...")
                  : cart.length > 0 ? "Sepeti Sat" : "Hemen Sat"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

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
  const inputRef = useRef<HTMLInputElement>(null)

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
    loadingTrue()
    function loadingTrue() { setLoading(true); setError(null); setResult(null); }
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

// ─── Help + Provider ──────────────────────────────────────────────────────────

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
  const [f1PreselectedDeviceId, setF1PreselectedDeviceId] = useState<string | null>(null)
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
