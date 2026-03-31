"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDevicePrice } from "@/actions/devices"

interface PriceEditFormProps {
  deviceId: string
  currentPrice: number | null
}

function formatPrice(price: number | null): string {
  if (price === null) return "—"
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price)
}

export function PriceEditForm({ deviceId, currentPrice }: PriceEditFormProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateDevicePrice(deviceId, formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        setEditing(false)
      }
    })
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold">{formatPrice(currentPrice)}</span>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Düzenle
        </Button>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="old-price" className="text-xs text-muted-foreground">
            Mevcut Fiyat
          </Label>
          <div className="text-sm font-medium text-muted-foreground">{formatPrice(currentPrice)}</div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="new_price">Yeni Fiyat (₺)</Label>
          <Input
            id="new_price"
            name="new_price"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="w-36"
            required
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setEditing(false); setError(null) }}
          >
            İptal
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
