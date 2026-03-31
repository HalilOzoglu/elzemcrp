"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { sellDevice, sellAccessory } from "@/actions/sales"
import { addDevice } from "@/actions/devices"
import { addAccessory } from "@/actions/accessories"
import { createClient } from "@/lib/supabase/client"
import type {
  InStockDevice,
  Contact,
  Accessory,
  Brand,
  Model,
  PaymentMethod,
  InvoiceType,
} from "@/lib/supabase/types"

interface NewSaleClientProps {
  devices: InStockDevice[]
  contacts: Pick<Contact, "id" | "full_name" | "contact_type">[]
  accessories: Pick<Accessory, "id" | "barcode" | "brand" | "category" | "stock_quantity" | "sale_price">[]
  brands: Brand[]
  models: Model[]
  defaultTab?: string
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  IBAN: "IBAN",
}

const INVOICE_LABELS: Record<InvoiceType, string> = {
  AF: "Alış Faturası",
  MF: "Müşteri Faturası",
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price)
}

function deviceLabel(d: InStockDevice): string {
  return `${d.brand} ${d.model} — ${d.color} / ${d.storage}`
}

function accessoryLabel(a: Pick<Accessory, "brand" | "category">): string {
  return [a.brand, a.category].filter(Boolean).join(" / ") || "—"
}

function groupByBrand(devices: InStockDevice[]): Record<string, InStockDevice[]> {
  return devices.reduce<Record<string, InStockDevice[]>>((acc, d) => {
    if (!acc[d.brand]) acc[d.brand] = []
    acc[d.brand].push(d)
    return acc
  }, {})
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

// ─── F1: Device Sale ──────────────────────────────────────────────────────────

function SaleSummaryDialog({
  open, onClose, deviceName, salePrice, paymentMethod, invoiceType,
}: {
  open: boolean; onClose: () => void; deviceName: string; salePrice: number
  paymentMethod: PaymentMethod | null; invoiceType: InvoiceType | null
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Satış Tamamlandı</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ürün</span>
            <span className="font-medium">{deviceName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Satış Fiyatı</span>
            <span className="font-medium">{formatPrice(salePrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ödeme Yöntemi</span>
            <span className="font-medium">{paymentMethod ? PAYMENT_LABELS[paymentMethod] : "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fatura Tipi</span>
            <span className="font-medium">{invoiceType ? INVOICE_LABELS[invoiceType] : "—"}</span>
          </div>
        </div>
        <DialogFooter><Button onClick={onClose}>Tamam</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeviceSaleForm({ devices, contacts }: {
  devices: InStockDevice[]
  contacts: Pick<Contact, "id" | "full_name" | "contact_type">[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryData, setSummaryData] = useState<{
    deviceName: string; salePrice: number
    paymentMethod: PaymentMethod | null; invoiceType: InvoiceType | null
  } | null>(null)

  const grouped = groupByBrand(devices)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const deviceId = formData.get("device_id") as string
    const selectedDevice = devices.find((d) => d.device_id === deviceId)
    startTransition(async () => {
      const result = await sellDevice(formData)
      if ("error" in result) { setError(result.error); toast.error(result.error); return }
      setSummaryData({
        deviceName: selectedDevice ? deviceLabel(selectedDevice) : result.summary.device_id,
        salePrice: result.summary.sale_price,
        paymentMethod: result.summary.payment_method,
        invoiceType: result.summary.invoice_type,
      })
      setSummaryOpen(true)
    })
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="device_id">Cihaz *</Label>
          <select id="device_id" name="device_id" required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
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
        <div className="space-y-2">
          <Label htmlFor="sale_price">Satış Fiyatı (₺) *</Label>
          <Input id="sale_price" name="sale_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_method">Ödeme Yöntemi</Label>
          <select id="payment_method" name="payment_method"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Seçiniz (opsiyonel)</option>
            <option value="CASH">Nakit</option>
            <option value="CREDIT_CARD">Kredi Kartı</option>
            <option value="IBAN">IBAN</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice_type">Fatura Tipi</Label>
          <select id="invoice_type" name="invoice_type"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Seçiniz (opsiyonel)</option>
            <option value="AF">Alış Faturası (AF)</option>
            <option value="MF">Müşteri Faturası (MF)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_id">Müşteri Carisi</Label>
          <select id="contact_id" name="contact_id"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Perakende (cari seçilmedi)</option>
            {contacts.filter((c) => c.contact_type === "CUSTOMER").map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending}>{isPending ? "İşleniyor..." : "Satışı Tamamla"}</Button>
      </form>
      {summaryData && (
        <SaleSummaryDialog
          open={summaryOpen}
          onClose={() => { setSummaryOpen(false); setSummaryData(null); router.push("/sales") }}
          deviceName={summaryData.deviceName}
          salePrice={summaryData.salePrice}
          paymentMethod={summaryData.paymentMethod}
          invoiceType={summaryData.invoiceType}
        />
      )}
    </>
  )
}

// ─── F2: Device Purchase ──────────────────────────────────────────────────────

function DevicePurchaseForm({ brands, models }: { brands: Brand[]; models: Model[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
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

  const filteredModels = models.filter((m) => m.brand_id === selectedBrandId)

  // Fetch variants when model changes
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

  async function handleSubmit(formData: FormData) {
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
      router.push("/devices")
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="f2_brand_id">Marka *</Label>
        <select id="f2_brand_id" name="brand_id" required value={selectedBrandId}
          onChange={(e) => { setSelectedBrandId(e.target.value); setSelectedModelId("") }}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">Marka seçin...</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="f2_model_id">Model *</Label>
        <select id="f2_model_id" name="model_id" required disabled={!selectedBrandId}
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
          <option value="">Model seçin...</option>
          {filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="f2_color">Renk *</Label>
          <Input id="f2_color" name="color" placeholder="Siyah" required list="f2_color_list" />
          <datalist id="f2_color_list">
            {colorOptions.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f2_storage">Hafıza *</Label>
          <Input id="f2_storage" name="storage" placeholder="128GB" required list="f2_storage_list" />
          <datalist id="f2_storage_list">
            {storageOptions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="f2_purchase_price">Alış Fiyatı (₺) *</Label>
        <Input id="f2_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f2_recommended_sale_price">Vitrin Fiyatı (₺)</Label>
        <Input id="f2_recommended_sale_price" name="recommended_sale_price" type="number" min="0.01" step="0.01" placeholder="0.00 (opsiyonel)" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f2_imei_1">IMEI 1</Label>
        <Input id="f2_imei_1" name="imei_1" placeholder="15 haneli IMEI (opsiyonel)" maxLength={15} />
      </div>
      <CheckboxField id="f2_is_dual_sim" name="is_dual_sim" label="Çift SIM" checked={isDualSim} onChange={setIsDualSim} />
      {isDualSim && (
        <div className="space-y-1">
          <Label htmlFor="f2_imei_2">IMEI 2 *</Label>
          <Input id="f2_imei_2" name="imei_2" placeholder="15 haneli IMEI (zorunlu)" maxLength={15} required />
        </div>
      )}
      <CheckboxField id="f2_is_new" name="is_new" label="Sıfır cihaz" checked={isNew} onChange={handleIsNewChange} />
      <CheckboxField id="f2_is_foreign" name="is_foreign" label="Yabancı menşei" checked={isForeign} onChange={setIsForeign} />
      <CheckboxField id="f2_has_box" name="has_box" label="Kutu var" checked={hasBox} onChange={setHasBox} />
      <CheckboxField id="f2_has_invoice" name="has_invoice" label="Fatura var" checked={hasInvoice} onChange={setHasInvoice} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="f2_warranty_months">Garanti (ay)</Label>
          <Input
            id="f2_warranty_months" name="warranty_months" type="number" min="0"
            value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f2_barcode">Barkod</Label>
          <Input id="f2_barcode" name="barcode" placeholder="Otomatik atanacak" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>{isPending ? "Ekleniyor..." : "Cihaz Ekle"}</Button>
    </form>
  )
}

// ─── F3: Accessory Purchase ───────────────────────────────────────────────────

function AccessoryPurchaseForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await addAccessory(formData)
      if ("error" in result) { setError(result.error); return }
      toast.success("Aksesuar başarıyla eklendi")
      router.push("/accessories")
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="f3_barcode">Barkod</Label>
        <Input id="f3_barcode" name="barcode" placeholder="Otomatik atanacak" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f3_brand">Marka</Label>
        <Input id="f3_brand" name="brand" placeholder="Marka (opsiyonel)" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f3_category">Kategori</Label>
        <Input id="f3_category" name="category" placeholder="Kategori (opsiyonel)" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f3_stock_quantity">Stok Adedi *</Label>
        <Input id="f3_stock_quantity" name="stock_quantity" type="number" min="0" step="1" placeholder="0" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f3_purchase_price">Alış Fiyatı (₺) *</Label>
        <Input id="f3_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f3_sale_price">Satış Fiyatı (₺) *</Label>
        <Input id="f3_sale_price" name="sale_price" type="number" min="0.01" step="0.01" placeholder="0.00" required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>{isPending ? "Ekleniyor..." : "Aksesuar Ekle"}</Button>
    </form>
  )
}

// ─── F4: Accessory Sale ───────────────────────────────────────────────────────

function AccessorySaleSummaryDialog({
  open, onClose, accessoryName, quantity, unitPrice,
}: {
  open: boolean; onClose: () => void; accessoryName: string; quantity: number; unitPrice: number
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Satış Tamamlandı</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ürün</span>
            <span className="font-medium">{accessoryName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Adet</span>
            <span className="font-medium">{quantity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Birim Fiyat</span>
            <span className="font-medium">{formatPrice(unitPrice)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground font-medium">Toplam</span>
            <span className="font-semibold">{formatPrice(unitPrice * quantity)}</span>
          </div>
        </div>
        <DialogFooter><Button onClick={onClose}>Tamam</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AccessorySaleForm({ accessories }: {
  accessories: Pick<Accessory, "id" | "barcode" | "brand" | "category" | "stock_quantity" | "sale_price">[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryData, setSummaryData] = useState<{
    accessoryName: string; quantity: number; unitPrice: number
  } | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const barcode = formData.get("accessory_barcode") as string
    const selectedAcc = accessories.find((a) => a.barcode === barcode)
    startTransition(async () => {
      const result = await sellAccessory(formData)
      if ("error" in result) { setError(result.error); toast.error(result.error); return }
      setSummaryData({
        accessoryName: selectedAcc ? accessoryLabel(selectedAcc) : barcode,
        quantity: result.summary.quantity,
        unitPrice: result.summary.sale_price,
      })
      setSummaryOpen(true)
    })
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="accessory_barcode">Aksesuar *</Label>
          <select id="accessory_barcode" name="accessory_barcode" required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Aksesuar seçin...</option>
            {accessories.map((a) => (
              <option key={a.barcode} value={a.barcode}>
                {a.barcode} — {accessoryLabel(a)} (Stok: {a.stock_quantity})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Adet *</Label>
          <Input id="quantity" name="quantity" type="number" min="1" step="1" defaultValue="1" required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending}>{isPending ? "İşleniyor..." : "Satışı Tamamla"}</Button>
      </form>
      {summaryData && (
        <AccessorySaleSummaryDialog
          open={summaryOpen}
          onClose={() => { setSummaryOpen(false); setSummaryData(null); router.push("/accessories") }}
          accessoryName={summaryData.accessoryName}
          quantity={summaryData.quantity}
          unitPrice={summaryData.unitPrice}
        />
      )}
    </>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function NewSaleClient({ devices, contacts, accessories, brands, models, defaultTab }: NewSaleClientProps) {
  const validTabs = ["f1", "f2", "f3", "f4"]
  const activeTab = defaultTab && validTabs.includes(defaultTab) ? defaultTab : "f1"

  return (
    <Tabs defaultValue={activeTab}>
      <TabsList>
        <TabsTrigger value="f1">F1 Cihaz Satış</TabsTrigger>
        <TabsTrigger value="f2">F2 Cihaz Alış</TabsTrigger>
        <TabsTrigger value="f3">F3 Aksesuar Alış</TabsTrigger>
        <TabsTrigger value="f4">F4 Aksesuar Satış</TabsTrigger>
      </TabsList>

      <TabsContent value="f1" className="pt-6">
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Stokta satışa hazır cihaz bulunmuyor.</p>
        ) : (
          <DeviceSaleForm devices={devices} contacts={contacts} />
        )}
      </TabsContent>

      <TabsContent value="f2" className="pt-6">
        <DevicePurchaseForm brands={brands} models={models} />
      </TabsContent>

      <TabsContent value="f3" className="pt-6">
        <AccessoryPurchaseForm />
      </TabsContent>

      <TabsContent value="f4" className="pt-6">
        {accessories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Stokta satışa hazır aksesuar bulunmuyor.</p>
        ) : (
          <AccessorySaleForm accessories={accessories} />
        )}
      </TabsContent>
    </Tabs>
  )
}
