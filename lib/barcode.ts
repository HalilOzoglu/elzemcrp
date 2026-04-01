/**
 * EAN-13 barkod üretici
 * Format: 12 basamak + 1 kontrol basamağı = 13 basamak
 * Prefix: 869 (Türkiye GS1 prefix)
 * Cihazlar: 8690001xxxxxx
 * Aksesuarlar: 8690002xxxxxx
 */

function ean13CheckDigit(digits12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits12[i], 10)
    sum += i % 2 === 0 ? d : d * 3
  }
  const check = (10 - (sum % 10)) % 10
  return String(check)
}

function generateEan13(prefix: string): string {
  // prefix: 7 basamak (örn: "8690001" cihaz, "8690002" aksesuar)
  // kalan 5 basamak: timestamp tabanlı rastgele
  const ts = Date.now().toString().slice(-5)
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, "0")
  // 5 basamak: ts'nin son 3 + rand'ın son 2
  const middle = (ts.slice(-3) + rand.slice(-2))
  const digits12 = prefix + middle
  const check = ean13CheckDigit(digits12)
  return digits12 + check
}

export function generateDeviceBarcode(): string {
  return generateEan13("8690001")
}

export function generateAccessoryBarcode(): string {
  return generateEan13("8690002")
}
