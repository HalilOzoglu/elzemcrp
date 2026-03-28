# Tasarım Dokümanı: Elzem İletişim POS/ERP

## Genel Bakış

Elzem İletişim POS/ERP, cep telefonu ve aksesuar perakende satışı için geliştirilmiş bir web uygulamasıdır. Next.js App Router (SSR), Supabase Auth + PostgreSQL ve Shadcn/ui üzerine inşa edilmiştir. Temel tasarım prensipleri sadelik, hız ve optimistic UI'dır.

Uygulama tek bir mağaza için tasarlanmıştır; çok kullanıcılı ama tek tenant yapısındadır. Tüm kullanıcılar aynı Supabase projesine bağlanır, kimlik doğrulama Supabase Auth ile yönetilir.

---

## Mimari

### Genel Mimari

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                  │
│  React Client Components + useOptimistic hooks       │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / Server Actions
┌──────────────────────▼──────────────────────────────┐
│               Next.js App Router (SSR)               │
│  Server Components (data fetch) + Server Actions     │
│  Middleware (auth guard)                             │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase JS SDK (server-side)
┌──────────────────────▼──────────────────────────────┐
│                    Supabase                          │
│  Auth (JWT)  │  PostgreSQL DB  │  Row Level Security │
└─────────────────────────────────────────────────────┘
```

### SSR Stratejisi

- **Server Components**: Sayfa ilk yüklemesinde tüm liste ve detay verileri sunucu tarafında çekilir. `createServerClient` (Supabase SSR paketi) kullanılır.
- **Server Actions**: Tüm mutasyon işlemleri (ekleme, güncelleme, silme, satış) Server Action olarak tanımlanır. Client'tan `action` prop veya `startTransition` ile çağrılır.
- **Client Components**: Yalnızca interaktif UI parçaları (formlar, filtreler, optimistic state) `"use client"` direktifi alır.
- **Caching**: `revalidatePath` / `revalidateTag` ile Server Action sonrası ilgili sayfalar yeniden doğrulanır.

### Optimistic UI Stratejisi

`useOptimistic` hook'u ile form gönderimlerinde sunucu yanıtı beklenmeksizin UI anında güncellenir:

```typescript
// Örnek pattern - liste sayfalarında
const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (state, newItem) => [...state, { ...newItem, pending: true }]
);

async function handleAdd(formData: FormData) {
  const newItem = parseFormData(formData);
  addOptimistic(newItem);          // UI anında güncellenir
  await serverAction(newItem);     // Sunucu işlemi arka planda
}
```

Hata durumunda `useOptimistic` otomatik olarak önceki state'e döner. Ek olarak `toast` bildirimi ile kullanıcı bilgilendirilir.


---

## Bileşen ve Arayüz Mimarisi

### Route Yapısı

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx              # Giriş sayfası (public)
├── (dashboard)/
│   ├── layout.tsx                # Auth guard + sidebar layout
│   ├── page.tsx                  # Dashboard (/)
│   ├── catalog/
│   │   └── page.tsx              # Marka/Model/Varyant yönetimi
│   ├── devices/
│   │   ├── page.tsx              # Cihaz listesi
│   │   └── [id]/
│   │       └── page.tsx          # Cihaz detay
│   ├── accessories/
│   │   └── page.tsx              # Aksesuar listesi
│   ├── contacts/
│   │   ├── page.tsx              # Cari listesi
│   │   └── [id]/
│   │       └── page.tsx          # Cari detay
│   ├── sales/
│   │   ├── page.tsx              # Satış listesi + yeni satış
│   │   └── new/
│   │       └── page.tsx          # Satış formu
│   └── reports/
│       └── page.tsx              # Raporlar
├── middleware.ts                  # Proxy çağrısı (updateSession)
├── lib/supabase/
│   ├── server.ts                 # createServerClient
│   ├── client.ts                 # createBrowserClient
│   ├── proxy.ts                  # updateSession + auth yönlendirme
│   └── types.ts                  # DB tip tanımları
└── actions/                       # Server Actions
    ├── auth.ts
    ├── catalog.ts
    ├── devices.ts
    ├── accessories.ts
    ├── contacts.ts
    └── sales.ts
```

### Proxy + Middleware (Auth Guard)

Supabase'in güncel `@supabase/ssr` yaklaşımında `middleware.ts` artık doğrudan Supabase client oluşturmaz; bunun yerine `lib/supabase/proxy.ts` içindeki `updateSession` yardımcısını çağırır. Bu proxy; süresi dolmuş token'ları yeniler, yenilenen token'ı hem Server Components'a hem tarayıcıya iletir.

```typescript
// middleware.ts  (sadece proxy'yi çağırır + auth yönlendirmesi)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

Auth yönlendirme mantığı (oturumu olmayan kullanıcıyı `/login`'e, oturumu olanı `/`'e yönlendirme) `lib/supabase/proxy.ts` içindeki `updateSession` fonksiyonuna taşınır.

### Supabase Client Yapısı

```
lib/supabase/
├── server.ts    # createServerClient (@supabase/ssr) - Server Components ve Actions için
├── client.ts    # createBrowserClient (@supabase/ssr) - Client Components için
├── proxy.ts     # updateSession - token yenileme + auth yönlendirme (middleware tarafından çağrılır)
└── types.ts     # Database tip tanımları (supabase gen types)
```

Env değişkenleri (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # Eski adı ANON_KEY; güncel dokümanda PUBLISHABLE_KEY
```

Kurulum:
```bash
npm install @supabase/supabase-js @supabase/ssr
npx shadcn@latest init
```

### Shadcn/ui Bileşen Kullanımı

| Kullanım Alanı | Bileşen |
|---|---|
| Veri tabloları | `Table`, `DataTable` (TanStack Table ile) |
| Formlar | `Form`, `Input`, `Select`, `Button` |
| Modallar | `Dialog`, `AlertDialog` |
| Hızlı düzenleme paneli | `Sheet` (sağdan kayan panel) |
| Bildirimler | `Sonner` (toast) |
| Yükleme | `Skeleton` |
| Uyarı rozetleri | `Badge` |
| Navigasyon | `Sidebar` (shadcn sidebar) |
| Grafikler | `Recharts` (shadcn charts) |
| Tarih seçici | `DatePicker` (Calendar + Popover) |
| Klavye kısayol yardımı | `Dialog` (kısayol listesi) |


---

## Veri Modelleri

Supabase PostgreSQL şemasındaki mevcut tablolar ve ilişkileri:

```
brands (id, name, created_at)
  └── models (id, brand_id, name, is_dual_sim, created_at)
        └── model_variants (id, model_id, color, storage, created_at)
              └── devices (id, variant_id, imei1, imei2, purchase_price,
                           display_price, status, contact_id, created_at)
                    ├── device_expenses (id, device_id, expense_type, amount, created_at)
                    ├── device_price_history (id, device_id, old_price, new_price, changed_at)
                    └── sales (id, device_id, ...)

contacts (id, name, phone, contact_type[CUSTOMER/SUPPLIER], created_at)
  └── sales (id, contact_id, device_id, accessory_id, sale_price,
             payment_method[CASH/CREDIT_CARD/IBAN],
             invoice_type[AF/MF], sold_at)

accessories (id, barcode, name, stock_count, purchase_price, sale_price, created_at)
  ├── accessory_history (id, accessory_id, field_changed, old_value, new_value, changed_at)
  └── sales (id, accessory_id, quantity, ...)
```

### TypeScript Tip Tanımları (Özet)

```typescript
// Supabase'den generate edilen tipler lib/supabase/types.ts'de tutulur
// Uygulama katmanında kullanılan view tipleri:

type InStockDevice = {
  id: string; imei_1: string | null; imei_2: string | null  // IMEI opsiyonel
  brand_name: string; model_name: string; variant_color: string; variant_storage: string
  purchase_price: number; recommended_sale_price: number | null; total_cost: number
  status: 'IN_STOCK' | 'SOLD' | 'RETURNED'
}

type MonthlySalesProfit = {
  month: string; sale_count: number
  total_revenue: number; total_cost: number; net_profit: number
}

type LowStockAccessory = {
  id: string; barcode: string; name: string; stock_count: number
}

type ContactVolume = {
  id: string; name: string; contact_type: 'CUSTOMER' | 'SUPPLIER'
  total_volume: number; transaction_count: number
}
```

---

## Modül Tasarım Kararları

### Kimlik Doğrulama Modülü

- Supabase Auth `signInWithPassword` kullanılır.
- Giriş formu Server Action ile işlenir; başarılı girişte `redirect('/dashboard')`.
- Oturum cookie'leri `@supabase/ssr` paketi ile otomatik yönetilir.
- Middleware her istekte oturumu doğrular; geçersiz oturumda `/login`'e yönlendirir.
- Şifre sıfırlama bu versiyonda kapsam dışıdır.

### Dashboard Modülü

- Tüm veriler Server Component'ta paralel olarak çekilir (`Promise.all`).
- Skeleton yükleme için `loading.tsx` dosyası kullanılır (Next.js Suspense).
- Özet kartlar: Stoktaki cihaz sayısı, bugünkü satış, aylık kar.
- Düşük stok uyarıları `v_low_stock_accessories` view'ından gelir (stok ≤ 5).

### Katalog Modülü (Marka/Model/Varyant)

- Tek sayfa üç sekme (Tab) ile yönetilir: Markalar / Modeller / Varyantlar.
- Ekleme/düzenleme işlemleri `Dialog` içindeki formlarla yapılır.
- Silme işlemi `AlertDialog` ile onaylanır; FK kısıtı hatası yakalanarak kullanıcıya gösterilir.
- Optimistic UI: Yeni marka/model/varyant ekleme anında listede görünür.

### Cihaz Envanteri Modülü

- Liste sayfası `v_in_stock_devices` view'ından SSR ile yüklenir.
- Durum filtresi (IN_STOCK/SOLD/RETURNED) URL search param ile yönetilir; SSR'da filtreleme yapılır.
- Yeni cihaz ekleme: `Dialog` içinde form; zorunlu alanlar yalnızca model varyantı ve alış fiyatıdır. IMEI ve vitrin fiyatı opsiyoneldir.
- IMEI girilmişse client-side (zod) + server-side format kontrolü yapılır (15 haneli rakam); girilmemişse kontrol atlanır.
- **Hızlı düzenleme paneli**: Listedeki bir satıra tıklandığında `Sheet` (sağdan kayan panel) açılır. Panel içeriği: vitrin fiyatı inline edit, durum değiştirme, masraf ekleme formu, fiyat geçmişi özeti. Sayfadan ayrılmaya gerek kalmaz.
- Detay sayfası (`/devices/[id]`): `get_total_device_cost()` ve `get_device_net_profit()` RPC çağrıları ile tam maliyet/kar analizi gösterilir.
- Vitrin fiyatı güncelleme: Tetikleyici `log_device_price_changes` otomatik history kaydeder.
- Masraf ekleme: Sheet paneli veya detay sayfasında; `device_expenses` tablosuna eklenir.

### Aksesuar Modülü

- Barkod veya ürün adına göre arama: URL search param + server-side `ilike` sorgusu.
- Stok ≤ 5 için `Badge` bileşeni kırmızı/sarı renk ile gösterilir.
- **Hızlı düzenleme paneli**: Listedeki bir satıra tıklandığında `Sheet` açılır. Panel içeriği: fiyat güncelleme, stok düzenleme, geçmiş değişiklikler özeti.
- Fiyat/stok güncelleme: Tetikleyici `log_accessory_changes` otomatik history kaydeder.
- Barkod benzersizliği: DB unique constraint + server action'da hata yakalama.

### Cari Modülü

- Tip filtresi (CUSTOMER/SUPPLIER) URL search param ile yönetilir.
- Detay sayfası: `v_contact_volumes` view'ından işlem hacmi + geçmiş satışlar.
- Silme: FK kısıtı (sales tablosu) yakalanarak kullanıcıya açıklayıcı mesaj gösterilir.

### Satış Modülü

- Yeni satış formu iki sekme: Cihaz Satışı / Aksesuar Satışı.
- Cihaz satışı: `sell_device()` RPC çağrısı; listeden veya barkod/IMEI ile cihaz seçimi. Müşteri carisi opsiyoneldir; seçilmezse `customer_id = NULL` ve satış listesinde "Perakende" etiketi gösterilir.
- Cihaz alışında (yeni cihaz eklerken) tedarikçi carisi opsiyoneldir; seçilmezse `supplier_id = NULL` ve "Perakende" olarak gösterilir.
- Aksesuar satışı: `sell_accessory()` RPC çağrısı; barkod ile aksesuar seçimi. Müşteri carisi, ödeme yöntemi ve fatura tipi opsiyoneldir.
- Satış tamamlandığında özet `Dialog` gösterilir.
- Satış listesinde `customer_id = NULL` olan kayıtlar "Perakende" olarak gösterilir.
- Satış listesi: Tarih aralığı, ödeme yöntemi ve fatura tipi filtreleri URL search param ile.
- Stok/durum kontrolleri server action içinde yapılır; hata mesajı toast ile gösterilir.

### Raporlama Modülü

- `v_monthly_sales_profit` view'ından aylık tablo + Recharts bar grafiği.
- Tarih aralığı filtresi `DatePicker` ile; URL search param olarak iletilir.
- Stok değeri özeti: `v_in_stock_devices` aggregate sorgusu.
- Kritik stok listesi: `v_low_stock_accessories` view'ı.
- Skeleton yükleme: `loading.tsx` + `Suspense` boundary.

### Klavye Kısayolları Modülü

Global kısayollar `useEffect` + `keydown` event listener ile `(dashboard)/layout.tsx` içinde yönetilir. Form alanı odaktayken (`document.activeElement` bir `input/textarea/select` ise) kısayollar devre dışı kalır.

| Kısayol | Eylem |
|---|---|
| `N` | Yeni satış formu aç |
| `D` | Yeni cihaz ekleme dialog'unu aç |
| `A` | Yeni aksesuar ekleme dialog'unu aç |
| `Escape` | Açık panel/modal'ı kapat |
| `?` | Kısayol yardım dialog'unu aç/kapat |

```typescript
// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      handlers[e.key]?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
```


---

## Doğruluk Özellikleri (Correctness Properties)

*Bir özellik (property), sistemin tüm geçerli çalışmalarında doğru olması gereken bir karakteristik veya davranıştır; yani sistemin ne yapması gerektiğine dair biçimsel bir ifadedir. Özellikler, insan tarafından okunabilir spesifikasyonlar ile makine tarafından doğrulanabilir doğruluk garantileri arasındaki köprüyü oluşturur.*

### Property 1: Korumalı Rota Erişim Reddi

*Herhangi bir* korumalı rota için, oturumu olmayan bir kullanıcı o rotaya erişmeye çalıştığında, sistem kullanıcıyı `/login` sayfasına yönlendirmelidir.

**Validates: Requirements 1.5**

---

### Property 2: Düşük Stok Uyarısı Tutarlılığı

*Herhangi bir* aksesuar seti için, stok adedi 5 veya altında olan tüm aksesuarlar Dashboard'da ve Aksesuar listesinde uyarı olarak gösterilmeli; stok adedi 5'in üzerinde olan hiçbir aksesuar uyarı olarak gösterilmemelidir.

**Validates: Requirements 2.2, 5.5, 8.3**

---

### Property 3: Katalog CRUD Round-Trip

*Herhangi bir* geçerli marka, model veya varyant için, oluşturma işlemi sonrasında o entity'yi sorgulama aynı veriyi döndürmeli; silme işlemi sonrasında ise sorgulama o entity'yi döndürmemelidir.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 4: Bağlı Entity Silme Koruması

*Herhangi bir* marka için bağlı modeller mevcutsa silme işlemi reddedilmeli; *herhangi bir* model için bağlı varyantlar mevcutsa silme işlemi reddedilmeli; *herhangi bir* cari için bağlı satış kayıtları mevcutsa silme işlemi reddedilmelidir.

**Validates: Requirements 3.4, 3.5, 6.6**

---

### Property 5: Varyant Zorunlu Alan Validasyonu

*Herhangi bir* varyant ekleme denemesinde, renk veya hafıza alanı boş bırakıldığında işlem reddedilmeli ve hata mesajı gösterilmelidir.

**Validates: Requirements 3.6**

---

### Property 6: IMEI Format Validasyonu (Koşullu)

*Herhangi bir* cihaz ekleme denemesinde, IMEI değeri girilmişse tam olarak 15 haneli rakamlardan oluşmalıdır; aksi hâlde işlem reddedilmeli ve hata mesajı gösterilmelidir. IMEI boş bırakılmışsa format kontrolü yapılmaz.

**Validates: Requirements 4.3, 4.4**

---

### Property 7: Cihaz Zorunlu Alan Validasyonu

*Herhangi bir* cihaz ekleme denemesinde, model varyantı veya alış fiyatı alanı boş bırakıldığında işlem reddedilmelidir. IMEI ve vitrin fiyatı opsiyonel olduğundan boş bırakılabilir.

**Validates: Requirements 4.2**

---

### Property 8: Fiyat Değişikliği History Kaydı

*Herhangi bir* cihazın vitrin fiyatı güncellendiğinde, `device_price_history` tablosunda eski ve yeni fiyatı içeren bir kayıt oluşturulmalıdır.

**Validates: Requirements 4.6**

---

### Property 9: Cihaz Durum Filtresi Tutarlılığı

*Herhangi bir* durum filtresi (IN_STOCK / SOLD / RETURNED) uygulandığında, döndürülen cihaz listesindeki tüm cihazlar yalnızca o durumda olmalıdır.

**Validates: Requirements 4.9**

---

### Property 10: Aksesuar Zorunlu Alan Validasyonu

*Herhangi bir* aksesuar ekleme denemesinde, barkod, ürün adı, stok adedi, alış fiyatı veya satış fiyatı alanlarından herhangi biri boş bırakıldığında işlem reddedilmelidir.

**Validates: Requirements 5.2**

---

### Property 11: Aksesuar Barkod Benzersizliği

*Herhangi bir* aksesuar ekleme denemesinde, sistemde zaten mevcut olan bir barkod kullanılırsa işlem reddedilmeli ve hata mesajı gösterilmelidir.

**Validates: Requirements 5.3**

---

### Property 12: Aksesuar Güncelleme History Kaydı

*Herhangi bir* aksesuar için fiyat veya stok adedi güncellendiğinde, `accessory_history` tablosunda değişikliği içeren bir kayıt oluşturulmalıdır.

**Validates: Requirements 5.4**

---

### Property 13: Aksesuar Arama Tutarlılığı

*Herhangi bir* arama terimi için, döndürülen aksesuar listesindeki tüm aksesuarlar barkod veya ürün adında o terimi içermelidir; terimi içermeyen hiçbir aksesuar döndürülmemelidir.

**Validates: Requirements 5.6**

---

### Property 14: Cari Zorunlu Alan Validasyonu

*Herhangi bir* cari ekleme denemesinde, ad veya cari tipi alanı boş bırakıldığında işlem reddedilmelidir.

**Validates: Requirements 6.2**

---

### Property 15: Cari Tip Filtresi Tutarlılığı

*Herhangi bir* cari tipi filtresi (CUSTOMER / SUPPLIER) uygulandığında, döndürülen cari listesindeki tüm cariler yalnızca o tipte olmalıdır.

**Validates: Requirements 6.3**

---

### Property 16: Aksesuar Satışı Stok Düşümü

*Herhangi bir* aksesuar ve geçerli adet için, satış tamamlandığında aksesuar stok adedi tam olarak satılan adet kadar azalmalıdır.

**Validates: Requirements 7.3**

---

### Property 17: Cihaz Satışı Durum Güncellemesi

*Herhangi bir* IN_STOCK cihaz için, satış tamamlandığında cihaz durumu SOLD olarak güncellenmelidir.

**Validates: Requirements 7.4**

---

### Property 18: Stok Dışı Cihaz Satış Reddi

*Herhangi bir* cihaz için, durumu IN_STOCK değilse (SOLD veya RETURNED), satış işlemi reddedilmeli ve kullanıcıya bilgilendirici mesaj gösterilmelidir.

**Validates: Requirements 7.5**

---

### Property 19: Yetersiz Aksesuar Stoku Satış Reddi

*Herhangi bir* aksesuar için, talep edilen adet mevcut stok adedini aşıyorsa satış işlemi reddedilmeli ve mevcut stok adedi kullanıcıya gösterilmelidir.

**Validates: Requirements 7.6**

---

### Property 20: Satış Listesi Filtre Tutarlılığı

*Herhangi bir* filtre kombinasyonu (tarih aralığı, ödeme yöntemi, fatura tipi) uygulandığında, döndürülen satış listesindeki tüm kayıtlar uygulanan tüm filtre kriterlerini karşılamalıdır.

**Validates: Requirements 7.8, 8.4**

---

### Property 21: Optimistic UI Geri Dönüş

*Herhangi bir* form gönderiminde, sunucu işlemi başarısız olduğunda UI önceki durumuna geri dönmeli ve kullanıcıya hata mesajı gösterilmelidir.

**Validates: Requirements 9.1, 9.6**

---

### Property 22: Inline Form Validasyonu

*Herhangi bir* veri giriş formunda, geçersiz bir değer girildiğinde ilgili alanın yanında inline hata mesajı gösterilmelidir.

**Validates: Requirements 9.4**


---

## Hata Yönetimi

### Hata Kategorileri ve Yanıtları

| Hata Türü | Kaynak | Kullanıcıya Gösterim |
|---|---|---|
| Validasyon hatası | Zod (client/server) | Inline form hatası |
| FK kısıtı ihlali | PostgreSQL | Toast + açıklayıcı mesaj |
| Benzersizlik ihlali | PostgreSQL unique constraint | Inline form hatası |
| Stok yetersizliği | Server Action kontrolü | Toast + mevcut stok bilgisi |
| Stok dışı cihaz satışı | Server Action kontrolü | Toast + cihaz durumu bilgisi |
| Supabase Auth hatası | Supabase | Inline form hatası (giriş sayfası) |
| Ağ/sunucu hatası | Next.js | Toast + retry butonu |

### Server Action Hata Yönetimi Paterni

```typescript
// actions/devices.ts
export async function addDevice(formData: FormData) {
  const parsed = deviceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }
  const supabase = createServerClient()
  const { error } = await supabase.from('devices').insert(parsed.data)
  if (error) {
    // PostgreSQL hata kodlarına göre anlamlı mesaj
    if (error.code === '23505') return { error: { imei_1: ['Bu IMEI zaten kayıtlı'] } }
    return { error: { _form: ['Bir hata oluştu, lütfen tekrar deneyin'] } }
  }
  revalidatePath('/devices')
  return { success: true }
}
```

### PostgreSQL Fonksiyon Hataları

`sell_device()` ve `sell_accessory()` RPC çağrıları hata fırlattığında Supabase JS SDK `error` objesi döner. Server Action bu hatayı yakalar ve kullanıcıya iletir.

---

## Test Stratejisi

### Çift Katmanlı Test Yaklaşımı

Birim testleri ve property-based testler birbirini tamamlar; her ikisi de kapsamlı doğrulama için gereklidir.

**Birim Testleri** (Vitest):
- Belirli örnekler ve edge case'ler için
- Server Action'ların doğru parametrelerle çağrıldığını doğrulama
- Hata mesajlarının doğru gösterildiğini doğrulama
- Supabase mock'u ile izole test

**Property-Based Testler** (fast-check):
- Evrensel özelliklerin tüm girdiler için geçerli olduğunu doğrulama
- Her property testi minimum 100 iterasyon çalıştırılır
- Her test, tasarım dokümanındaki property'ye referans içerir

### Property-Based Test Konfigürasyonu

```typescript
// Örnek property testi - IMEI validasyonu (Property 6)
import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { validateImei } from '@/lib/validations'

describe('Feature: elzem-iletisim-pos, Property 6: IMEI Format Validasyonu', () => {
  it('15 haneli olmayan her string reddedilmeli', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !/^\d{15}$/.test(s)),
        (invalidImei) => {
          const result = validateImei(invalidImei)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Tam 15 haneli rakam dizisi kabul edilmeli', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 15, maxLength: 15 }),
        (validImei) => {
          const result = validateImei(validImei)
          expect(result.success).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Test Dosya Yapısı

```
__tests__/
├── unit/
│   ├── auth.test.ts
│   ├── catalog.test.ts
│   ├── devices.test.ts
│   ├── accessories.test.ts
│   ├── contacts.test.ts
│   └── sales.test.ts
└── property/
    ├── auth.property.test.ts        # Property 1
    ├── catalog.property.test.ts     # Properties 3, 4, 5
    ├── devices.property.test.ts     # Properties 6, 7, 8, 9
    ├── accessories.property.test.ts # Properties 2, 10, 11, 12, 13
    ├── contacts.property.test.ts    # Properties 14, 15
    ├── sales.property.test.ts       # Properties 16, 17, 18, 19, 20
    └── ux.property.test.ts          # Properties 21, 22
```

### Property Test Etiket Formatı

Her property testi şu formatta etiketlenmelidir:

`Feature: elzem-iletisim-pos, Property {N}: {property_başlığı}`

### Birim Test Odak Alanları

- Giriş/çıkış yönlendirme davranışları (1.2, 1.4)
- Dashboard veri gösterimi (2.1, 2.3)
- Satış özeti gösterimi (7.7)
- Rapor içerik doğrulaması (8.1, 8.2)
- Skeleton yükleme göstergesi (2.4, 8.5)
- Cari detay sayfası içeriği (6.5)

