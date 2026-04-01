"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface StockDevice {
  device_id: string
  brand: string
  model: string
  color: string
  storage: string
  barcode: string | null
  imei_1: string | null
}

interface StockCountClientProps {
  devices: StockDevice[]
}

export function StockCountClient({ devices }: StockCountClientProps) {
  const [scanned, setScanned] = useState<Set<string>>(new Set())
  const [input, setInput] = useState("")
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleScan(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return

    // Barkod veya IMEI ile eşleştir
    const found = devices.find(
      (d) => d.barcode === trimmed || d.imei_1 === trimmed
    )

    if (!found) {
      setLastResult({ ok: false, msg: `"${trimmed}" — sistemde bulunamadı` })
    } else if (scanned.has(found.device_id)) {
      setLastResult({ ok: false, msg: `${found.brand} ${found.model} — zaten okutuldu` })
    } else {
      setScanned((prev) => new Set([...prev, found.device_id]))
      setLastResult({ ok: true, msg: `${found.brand} ${found.model} (${found.color} / ${found.storage}) — eklendi` })
    }
    setInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleScan(input)
    }
  }

  const scannedDevices = devices.filter((d) => scanned.has(d.device_id))
  const missingDevices = devices.filter((d) => !scanned.has(d.device_id))

  return (
    <div className="space-y-6">
      {/* Scanner input */}
      <div className="space-y-2 max-w-md">
        <p className="text-sm text-muted-foreground">Barkod okuyucu veya IMEI ile cihaz okutun. Her okutmadan sonra Enter'a basın.</p>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Barkod veya IMEI girin..."
            className="font-mono"
          />
          <Button type="button" onClick={() => handleScan(input)}>Ekle</Button>
        </div>
        {lastResult && (
          <p className={`text-sm font-medium ${lastResult.ok ? "text-green-600" : "text-destructive"}`}>
            {lastResult.ok ? "✓" : "✗"} {lastResult.msg}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span>Toplam stok: <strong>{devices.length}</strong></span>
        <span className="text-green-600">Okutuldu: <strong>{scanned.size}</strong></span>
        <span className="text-destructive">Eksik: <strong>{missingDevices.length}</strong></span>
        {scanned.size > 0 && (
          <Button size="sm" variant="ghost" className="h-auto py-0 text-muted-foreground" onClick={() => { setScanned(new Set()); setLastResult(null) }}>
            Sıfırla
          </Button>
        )}
      </div>

      {/* Missing devices */}
      {missingDevices.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-destructive">Okutulmayan Cihazlar ({missingDevices.length})</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cihaz</TableHead>
                <TableHead>Renk / Hafıza</TableHead>
                <TableHead>Barkod</TableHead>
                <TableHead>IMEI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missingDevices.map((d) => (
                <TableRow key={d.device_id}>
                  <TableCell className="font-medium">{d.brand} {d.model}</TableCell>
                  <TableCell>{d.color} / {d.storage}</TableCell>
                  <TableCell className="font-mono text-sm">{d.barcode ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{d.imei_1 ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Scanned devices */}
      {scannedDevices.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-green-600">Okutuldu ({scannedDevices.length})</h3>
          <div className="flex flex-wrap gap-2">
            {scannedDevices.map((d) => (
              <Badge key={d.device_id} variant="outline" className="text-xs">
                {d.brand} {d.model} — {d.color}/{d.storage}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
