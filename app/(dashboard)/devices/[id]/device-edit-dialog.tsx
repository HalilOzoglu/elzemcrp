"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { updateDevice } from "@/actions/devices"

interface DeviceEditDialogProps {
  deviceId: string
  device: {
    color: string
    storage: string
    purchase_price: number
    recommended_sale_price: number | null
    imei_1: string | null
    imei_2: string | null
    is_dual_sim: boolean
    is_new: boolean
    is_foreign: boolean
    has_box: boolean
    has_invoice: boolean
    warranty_months: number
    barcode: string | null
    battery_health: number | null
  }
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

export function DeviceEditDialog({ deviceId, device }: DeviceEditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [isDualSim, setIsDualSim] = useState(device.is_dual_sim)
  const [isNew, setIsNew] = useState(device.is_new)
  const [isForeign, setIsForeign] = useState(device.is_foreign)
  const [hasBox, setHasBox] = useState(device.has_box)
  const [hasInvoice, setHasInvoice] = useState(device.has_invoice)
  const [warrantyMonths, setWarrantyMonths] = useState(String(device.warranty_months))

  function handleIsNewChange(v: boolean) {
    setIsNew(v)
    setWarrantyMonths(v ? "24" : "0")
  }

  function handleOpen() {
    setIsDualSim(device.is_dual_sim)
    setIsNew(device.is_new)
    setIsForeign(device.is_foreign)
    setHasBox(device.has_box)
    setHasInvoice(device.has_invoice)
    setWarrantyMonths(String(device.warranty_months))
    setError(null)
    setOpen(true)
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
      const result = await updateDevice(deviceId, formData)
      if ("error" in result) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        Düzenle
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cihaz Düzenle</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="de_color">Renk *</Label>
                <Input id="de_color" name="color" defaultValue={device.color} placeholder="Siyah" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="de_storage">Hafıza *</Label>
                <Input id="de_storage" name="storage" defaultValue={device.storage} placeholder="128GB" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="de_purchase_price">Alış Fiyatı (₺) *</Label>
              <Input id="de_purchase_price" name="purchase_price" type="number" min="0.01" step="0.01" defaultValue={device.purchase_price} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="de_recommended_sale_price">Vitrin Fiyatı (₺)</Label>
              <Input id="de_recommended_sale_price" name="recommended_sale_price" type="number" min="0.01" step="0.01" defaultValue={device.recommended_sale_price ?? ""} placeholder="Opsiyonel" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="de_imei_1">IMEI 1</Label>
              <Input id="de_imei_1" name="imei_1" defaultValue={device.imei_1 ?? ""} placeholder="15 haneli IMEI" maxLength={15} />
            </div>
            <CheckboxField id="de_is_dual_sim" name="is_dual_sim" label="Çift SIM" checked={isDualSim} onChange={setIsDualSim} />
            {isDualSim && (
              <div className="space-y-1">
                <Label htmlFor="de_imei_2">IMEI 2 *</Label>
                <Input id="de_imei_2" name="imei_2" defaultValue={device.imei_2 ?? ""} placeholder="15 haneli IMEI (zorunlu)" maxLength={15} required />
              </div>
            )}
            <CheckboxField id="de_is_new" name="is_new" label="Sıfır cihaz" checked={isNew} onChange={handleIsNewChange} />
            <CheckboxField id="de_is_foreign" name="is_foreign" label="Yabancı menşei" checked={isForeign} onChange={setIsForeign} />
            <CheckboxField id="de_has_box" name="has_box" label="Kutu var" checked={hasBox} onChange={setHasBox} />
            <CheckboxField id="de_has_invoice" name="has_invoice" label="Fatura var" checked={hasInvoice} onChange={setHasInvoice} />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="de_warranty_months">Garanti (ay)</Label>
                <Input
                  id="de_warranty_months" name="warranty_months" type="number" min="0"
                  value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="de_battery_health">Pil Durumu (%)</Label>
                <Input
                  id="de_battery_health" name="battery_health" type="number" min="0" max="100"
                  placeholder={isNew ? "100 (otomatik)" : "0-100"}
                  disabled={isNew}
                  defaultValue={device.battery_health ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="de_barcode">Barkod</Label>
                <Input id="de_barcode" name="barcode" defaultValue={device.barcode ?? ""} placeholder="Opsiyonel" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Kaydediliyor..." : "Kaydet"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
