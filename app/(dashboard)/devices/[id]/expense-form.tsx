"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addDeviceExpense } from "@/actions/devices"

interface ExpenseFormProps {
  deviceId: string
}

export function ExpenseForm({ deviceId }: ExpenseFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await addDeviceExpense(deviceId, formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        // Reset form
        const form = document.getElementById("expense-form") as HTMLFormElement
        form?.reset()
      }
    })
  }

  return (
    <form id="expense-form" action={handleSubmit} className="space-y-3">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="expense_name">Masraf Adı</Label>
          <Input
            id="expense_name"
            name="expense_name"
            type="text"
            placeholder="Örn: Tamir, Kargo"
            className="w-44"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount">Tutar (₺)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="w-32"
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Ekleniyor..." : "Masraf Ekle"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
