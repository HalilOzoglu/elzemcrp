# Uygulama Planı: Elzem İletişim POS/ERP

## Genel Bakış

Next.js App Router, Supabase ve Shadcn/ui üzerine inşa edilmiş POS/ERP uygulamasının adım adım uygulama planı. Her görev bir öncekinin üzerine inşa edilir; son adımda tüm modüller birbirine bağlanır.

## Görevler

- [ ] 1. Proje altyapısı ve temel yapılandırma
  - Next.js App Router projesi oluştur (`npx create-next-app@latest`); Tailwind CSS, App Router ve `@/*` alias seçeneklerini etkinleştir
  - `npm install @supabase/supabase-js @supabase/ssr` ile Supabase paketlerini ekle; `npx shadcn@latest init` ile Shadcn/ui'yi başlat; Zod, Vitest ve fast-check bağımlılıklarını ekle
  - `.env.local` dosyasını oluştur: `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değişkenlerini tanımla
  - `lib/supabase/server.ts` (createServerClient), `lib/supabase/client.ts` (createBrowserClient), `lib/supabase/proxy.ts` (updateSession + auth yönlendirme) ve `lib/supabase/types.ts` dosyalarını oluştur
  - `middleware.ts` dosyasını yaz: yalnızca `updateSession`'ı çağırır; auth yönlendirme mantığı `proxy.ts` içindedir
  - `__tests__/unit/` ve `__tests__/property/` dizin yapısını oluştur, `vitest.config.ts` dosyasını yapılandır
  - _Requirements: 1.5, 1.6, 9.3_

  - [ ]* 1.1 Auth guard middleware için property testi yaz
    - **Property 1: Korumalı Rota Erişim Reddi**
    - **Validates: Requirements 1.5**

- [ ] 2. Kimlik doğrulama modülü
  - [ ] 2.1 Giriş sayfası ve Server Action'ı uygula
    - `app/(auth)/login/page.tsx` oluştur; Shadcn/ui `Form`, `Input`, `Button` bileşenleriyle e-posta/şifre formu
    - `actions/auth.ts` içinde `signIn` Server Action'ı yaz: `signInWithPassword` çağrısı, başarıda `/`'e redirect, hata durumunda inline hata mesajı
    - `signOut` Server Action'ı yaz: oturumu sonlandır, `/login`'e redirect
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.2 Giriş/çıkış yönlendirme davranışları için birim testi yaz
    - Başarılı girişte dashboard'a yönlendirme
    - Geçersiz kimlik bilgilerinde hata mesajı gösterimi
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 3. Dashboard modülü
  - [ ] 3.1 Dashboard Server Component'ı uygula
    - `app/(dashboard)/layout.tsx` oluştur: auth guard + Shadcn/ui Sidebar navigasyon
    - `app/(dashboard)/page.tsx` oluştur: `Promise.all` ile paralel veri çekimi (stoktaki cihaz sayısı, bugünkü satış, `v_monthly_sales_profit`, `v_low_stock_accessories`)
    - Özet kartları ve düşük stok uyarı kartlarını render et; her karta tıklandığında ilgili modül sayfasına yönlendir
    - `app/(dashboard)/loading.tsx` oluştur: Skeleton yükleme göstergesi
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 Dashboard veri gösterimi için birim testi yaz
    - Özet kart değerlerinin doğru render edilmesi
    - Skeleton yükleme göstergesinin varlığı
    - _Requirements: 2.1, 2.3, 2.4_

- [ ] 4. Checkpoint — Tüm testlerin geçtiğini doğrula
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [ ] 5. Katalog modülü (Marka / Model / Varyant)
  - [ ] 5.1 Katalog sayfası ve Server Action'ları uygula
    - `app/(dashboard)/catalog/page.tsx` oluştur: üç sekme (Markalar / Modeller / Varyantlar), SSR ile veri çekimi
    - `actions/catalog.ts` içinde `addBrand`, `updateBrand`, `deleteBrand`, `addModel`, `updateModel`, `deleteModel`, `addVariant`, `updateVariant`, `deleteVariant` Server Action'larını yaz
    - Ekleme/düzenleme için `Dialog` formları, silme için `AlertDialog` onayı uygula
    - FK kısıtı hatalarını yakala (PostgreSQL `23503`), kullanıcıya açıklayıcı mesaj göster
    - Zod şemaları: varyant için renk ve hafıza zorunlu
    - Optimistic UI: yeni marka/model/varyant ekleme anında listede görünür
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.2 Katalog CRUD round-trip için property testi yaz
    - **Property 3: Katalog CRUD Round-Trip**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 5.3 Bağlı entity silme koruması için property testi yaz
    - **Property 4: Bağlı Entity Silme Koruması** (marka ve model için)
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 5.4 Varyant zorunlu alan validasyonu için property testi yaz
    - **Property 5: Varyant Zorunlu Alan Validasyonu**
    - **Validates: Requirements 3.6**

- [ ] 6. Cihaz envanteri modülü
  - [ ] 6.1 Cihaz listesi sayfasını uygula
    - `app/(dashboard)/devices/page.tsx` oluştur: `v_in_stock_devices` view'ından SSR ile veri çekimi
    - Durum filtresi (IN_STOCK/SOLD/RETURNED) URL search param ile yönet; sunucu tarafında filtrele
    - Yeni cihaz ekleme `Dialog` formu: zorunlu alanlar model varyantı + alış fiyatı; IMEI ve vitrin fiyatı opsiyonel
    - Zod şeması: IMEI girilmişse `^\d{15}$` regex kontrolü, boşsa atla; çift SIM için ikinci IMEI farklılık kontrolü
    - `actions/devices.ts` içinde `addDevice` Server Action'ı yaz
    - Optimistic UI ile yeni cihaz anında listede görünür
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.9_

  - [ ]* 6.2 IMEI format validasyonu için property testi yaz
    - **Property 6: IMEI Format Validasyonu (Koşullu)**
    - **Validates: Requirements 4.3, 4.4**

  - [ ]* 6.3 Cihaz zorunlu alan validasyonu için property testi yaz
    - **Property 7: Cihaz Zorunlu Alan Validasyonu**
    - **Validates: Requirements 4.2**

  - [ ]* 6.4 Cihaz durum filtresi tutarlılığı için property testi yaz
    - **Property 9: Cihaz Durum Filtresi Tutarlılığı**
    - **Validates: Requirements 4.9**

  - [ ] 6.5 Cihaz detay sayfasını uygula
    - `app/(dashboard)/devices/[id]/page.tsx` oluştur: `get_total_device_cost()` ve `get_device_net_profit()` RPC çağrıları ile maliyet/kar gösterimi
    - Vitrin fiyatı inline düzenleme: eski/yeni fiyat yan yana; `updateDevicePrice` Server Action'ı yaz (`device_price_history` tetikleyici otomatik kaydeder)
    - Masraf ekleme formu: `addDeviceExpense` Server Action'ı yaz
    - _Requirements: 4.5, 4.6, 4.7, 4.8_

  - [ ]* 6.6 Fiyat değişikliği history kaydı için property testi yaz
    - **Property 8: Fiyat Değişikliği History Kaydı**
    - **Validates: Requirements 4.6**

- [ ] 7. Aksesuar modülü
  - [ ] 7.1 Aksesuar listesi sayfasını uygula
    - `app/(dashboard)/accessories/page.tsx` oluştur: SSR ile aksesuar listesi, barkod/ürün adı arama URL search param + `ilike` sorgusu
    - Stok ≤ 5 için `Badge` bileşeni kırmızı/sarı renk ile göster
    - Yeni aksesuar ekleme `Dialog` formu: tüm alanlar zorunlu (barkod, ad, stok, alış fiyatı, satış fiyatı)
    - Fiyat/stok güncelleme formu: `updateAccessory` Server Action'ı yaz (`accessory_history` tetikleyici otomatik kaydeder)
    - `actions/accessories.ts` içinde `addAccessory`, `updateAccessory` Server Action'larını yaz
    - Barkod unique constraint hatasını yakala (PostgreSQL `23505`), inline hata göster
    - Optimistic UI ile yeni aksesuar ve güncellemeler anında yansır
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 7.2 Düşük stok uyarısı tutarlılığı için property testi yaz
    - **Property 2: Düşük Stok Uyarısı Tutarlılığı**
    - **Validates: Requirements 2.2, 5.5, 8.3**

  - [ ]* 7.3 Aksesuar zorunlu alan validasyonu için property testi yaz
    - **Property 10: Aksesuar Zorunlu Alan Validasyonu**
    - **Validates: Requirements 5.2**

  - [ ]* 7.4 Aksesuar barkod benzersizliği için property testi yaz
    - **Property 11: Aksesuar Barkod Benzersizliği**
    - **Validates: Requirements 5.3**

  - [ ]* 7.5 Aksesuar güncelleme history kaydı için property testi yaz
    - **Property 12: Aksesuar Güncelleme History Kaydı**
    - **Validates: Requirements 5.4**

  - [ ]* 7.6 Aksesuar arama tutarlılığı için property testi yaz
    - **Property 13: Aksesuar Arama Tutarlılığı**
    - **Validates: Requirements 5.6**

- [ ] 8. Checkpoint — Tüm testlerin geçtiğini doğrula
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [ ] 9. Cari modülü
  - [ ] 9.1 Cari listesi ve detay sayfalarını uygula
    - `app/(dashboard)/contacts/page.tsx` oluştur: SSR ile cari listesi, CUSTOMER/SUPPLIER filtresi URL search param ile
    - `v_contact_volumes` view'ından işlem hacmini göster
    - Yeni cari ekleme `Dialog` formu: ad ve cari tipi zorunlu
    - `app/(dashboard)/contacts/[id]/page.tsx` oluştur: cari detayı + geçmiş satışlar (tarih, tutar, ödeme yöntemi)
    - `actions/contacts.ts` içinde `addContact`, `updateContact`, `deleteContact` Server Action'larını yaz
    - FK kısıtı hatasını yakala (sales tablosu), kullanıcıya açıklayıcı mesaj göster
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 9.2 Cari zorunlu alan validasyonu için property testi yaz
    - **Property 14: Cari Zorunlu Alan Validasyonu**
    - **Validates: Requirements 6.2**

  - [ ]* 9.3 Cari tip filtresi tutarlılığı için property testi yaz
    - **Property 15: Cari Tip Filtresi Tutarlılığı**
    - **Validates: Requirements 6.3**

  - [ ]* 9.4 Bağlı entity silme koruması (cari) için property testi yaz
    - **Property 4: Bağlı Entity Silme Koruması** (cari için)
    - **Validates: Requirements 6.6**

  - [ ]* 9.5 Cari detay sayfası içeriği için birim testi yaz
    - Geçmiş satışların tarih, tutar ve ödeme yöntemi ile listelendiğini doğrula
    - _Requirements: 6.5_

- [ ] 10. Satış modülü
  - [ ] 10.1 Satış listesi sayfasını uygula
    - `app/(dashboard)/sales/page.tsx` oluştur: SSR ile satış listesi; `contact_id = NULL` olan kayıtlar "Perakende" etiketi ile gösterilir
    - Tarih aralığı (`DatePicker`), ödeme yöntemi ve fatura tipi filtreleri URL search param ile yönet
    - _Requirements: 7.7, 7.8_

  - [ ] 10.2 Cihaz satışı Server Action'ı uygula
    - `app/(dashboard)/sales/new/page.tsx` oluştur: iki sekme (Cihaz Satışı / Aksesuar Satışı)
    - `actions/sales.ts` içinde `sellDevice` Server Action'ı yaz: `sell_device()` RPC çağrısı; cihaz seçimi, satış fiyatı, ödeme yöntemi, fatura tipi; müşteri carisi opsiyonel (NULL → "Perakende")
    - Cihaz durumu IN_STOCK değilse satışı engelle, toast ile bildir
    - Satış tamamlandığında özet `Dialog` göster
    - _Requirements: 7.1, 7.4, 7.5, 7.7_

  - [ ]* 10.3 Cihaz satışı durum güncellemesi için property testi yaz
    - **Property 17: Cihaz Satışı Durum Güncellemesi**
    - **Validates: Requirements 7.4**

  - [ ]* 10.4 Stok dışı cihaz satış reddi için property testi yaz
    - **Property 18: Stok Dışı Cihaz Satış Reddi**
    - **Validates: Requirements 7.5**

  - [ ] 10.5 Aksesuar satışı Server Action'ı uygula
    - `actions/sales.ts` içinde `sellAccessory` Server Action'ı yaz: `sell_accessory()` RPC çağrısı; barkod ile aksesuar seçimi, adet; müşteri carisi, ödeme yöntemi ve fatura tipi opsiyonel
    - Stok yetersizliğinde satışı engelle, mevcut stok adedini toast ile göster
    - Satış tamamlandığında stok adedini düşür, özet `Dialog` göster
    - _Requirements: 7.2, 7.3, 7.6, 7.7_

  - [ ]* 10.6 Aksesuar satışı stok düşümü için property testi yaz
    - **Property 16: Aksesuar Satışı Stok Düşümü**
    - **Validates: Requirements 7.3**

  - [ ]* 10.7 Yetersiz aksesuar stoku satış reddi için property testi yaz
    - **Property 19: Yetersiz Aksesuar Stoku Satış Reddi**
    - **Validates: Requirements 7.6**

  - [ ]* 10.8 Satış listesi filtre tutarlılığı için property testi yaz
    - **Property 20: Satış Listesi Filtre Tutarlılığı**
    - **Validates: Requirements 7.8, 8.4**

  - [ ]* 10.9 Satış özeti gösterimi için birim testi yaz
    - Satış tamamlandığında ürün, tutar ve ödeme yöntemi bilgilerinin özet Dialog'da gösterildiğini doğrula
    - _Requirements: 7.7_

- [ ] 11. Checkpoint — Tüm testlerin geçtiğini doğrula
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [ ] 12. Raporlama modülü
  - [ ] 12.1 Raporlar sayfasını uygula
    - `app/(dashboard)/reports/page.tsx` oluştur: SSR ile `v_monthly_sales_profit` verisi; Recharts bar grafiği + tablo (satış adedi, toplam tutar, maliyet, net kar)
    - `v_in_stock_devices` aggregate sorgusu ile stok değeri özeti (toplam alış maliyeti + toplam vitrin fiyatı)
    - `v_low_stock_accessories` view'ından kritik stok listesi
    - `DatePicker` ile tarih aralığı filtresi, URL search param olarak ilet
    - `loading.tsx` + `Suspense` boundary ile skeleton yükleme
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 12.2 Rapor içerik doğrulaması için birim testi yaz
    - Aylık tablo verilerinin doğru render edilmesi
    - Stok değeri özetinin doğru hesaplanması
    - Skeleton yükleme göstergesinin varlığı
    - _Requirements: 8.1, 8.2, 8.5_

- [ ] 13. UX ve form validasyonu
  - [ ] 13.1 Inline form validasyonu ve Optimistic UI geri dönüşünü uygula
    - Tüm formlarda Zod şemalarını `react-hook-form` ile entegre et; geçersiz değerde ilgili alanın yanında inline hata mesajı göster
    - Tüm Server Action'larda `useOptimistic` hook'u ile optimistic state yönetimini tamamla; sunucu hatası durumunda önceki state'e dön ve `Sonner` toast ile bildir
    - Ağ/sunucu hatalarında toast + retry butonu göster
    - _Requirements: 9.1, 9.4, 9.6_

  - [ ] 13.2 Klavye kısayolları ve Sheet panellerini uygula
    - `hooks/useKeyboardShortcuts.ts` hook'unu yaz: form alanı odaktayken devre dışı kalır
    - `(dashboard)/layout.tsx` içinde global kısayolları bağla: `N` → yeni satış, `D` → yeni cihaz, `A` → yeni aksesuar, `?` → yardım dialog'u
    - Cihaz listesinde satıra tıklandığında `Sheet` paneli aç: vitrin fiyatı düzenleme, durum değiştirme, masraf ekleme
    - Aksesuar listesinde satıra tıklandığında `Sheet` paneli aç: fiyat ve stok güncelleme
    - `Escape` tuşu ile açık panel/modal'ı kapat
    - Kısayol yardım `Dialog`'unu uygula (`?` tuşu ile açılır)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 13.3 Optimistic UI geri dönüş için property testi yaz
    - **Property 21: Optimistic UI Geri Dönüş**
    - **Validates: Requirements 9.1, 9.6**

  - [ ]* 13.4 Inline form validasyonu için property testi yaz
    - **Property 22: Inline Form Validasyonu**
    - **Validates: Requirements 9.4**

- [ ] 14. Son checkpoint — Tüm testlerin geçtiğini doğrula
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

## Notlar

- `*` ile işaretli görevler opsiyoneldir; hızlı MVP için atlanabilir
- Her görev ilgili gereksinim numaralarına referans içerir
- Property testleri `fast-check` ile, birim testleri `Vitest` ile yazılır
- Her property testi `Feature: elzem-iletisim-pos, Property {N}: {başlık}` formatında etiketlenir
- Tüm mutasyonlar Server Action ile yapılır; liste sayfaları SSR ile ilk veriyi çeker
- IMEI opsiyoneldir; girilmişse 15 haneli format kontrolü hem client (Zod) hem server tarafında yapılır
- Cari seçilmediğinde satış/alış "Perakende" olarak kaydedilir (`contact_id = NULL`)
