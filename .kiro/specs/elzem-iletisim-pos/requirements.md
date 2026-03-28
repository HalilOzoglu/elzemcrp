# Gereksinimler Dokümanı

## Giriş

Elzem İletişim, cep telefonu ve aksesuar satışı yapan bir perakende mağazası için geliştirilecek kapsamlı bir POS/ERP web uygulamasıdır. Uygulama; cihaz envanteri, aksesuar stok yönetimi, cari hesap takibi, satış işlemleri ve raporlama modüllerini kapsar. Next.js (SSR), Supabase Auth ve Shadcn/ui kullanılarak geliştirilecektir. Sadelik ve hız temel tasarım prensipleridir.

## Sözlük

- **POS_System**: Elzem İletişim POS/ERP web uygulaması
- **Auth_Module**: Supabase Auth tabanlı kimlik doğrulama modülü
- **Device_Manager**: Cihaz (fiziksel telefon) envanter yönetim modülü
- **Accessory_Manager**: Aksesuar stok yönetim modülü
- **Contact_Manager**: Cari (müşteri/tedarikçi) yönetim modülü
- **Sales_Module**: Satış işlemleri modülü
- **Report_Module**: Raporlama ve istatistik modülü
- **Catalog_Manager**: Marka, model ve varyant yönetim modülü
- **Dashboard**: Özet istatistik ve uyarı ekranı
- **IMEI**: Cihazı benzersiz olarak tanımlayan 15 haneli uluslararası mobil ekipman kimliği (opsiyonel; girilmişse format doğrulanır)
- **Cari**: Müşteri veya tedarikçi olarak tanımlanmış iş ortağı (contact_type: CUSTOMER/SUPPLIER)
- **Perakende**: Cari bilgisi girilmeksizin gerçekleştirilen anonim alış veya satış işlemi; sistemde sabit "Perakende" etiketi ile gösterilir
- **Varyant**: Renk ve hafıza kombinasyonundan oluşan model alt tipi
- **Vitrin Fiyatı**: Cihazın satışa sunulduğu liste fiyatı
- **Fatura Tipi**: AF (Alış Faturası) veya MF (Müstahsil Faturası)

---

## Gereksinimler

### Gereksinim 1: Kimlik Doğrulama

**Kullanıcı Hikayesi:** Mağaza yöneticisi olarak, sisteme güvenli şekilde giriş yapmak istiyorum; böylece yetkisiz erişimi engelleyebilirim.

#### Kabul Kriterleri

1. THE Auth_Module SHALL Supabase Auth kullanarak e-posta ve şifre ile kimlik doğrulama sağlamalıdır.
2. WHEN kullanıcı geçerli kimlik bilgileri girer, THE Auth_Module SHALL kullanıcıyı Dashboard sayfasına yönlendirmelidir.
3. IF kullanıcı geçersiz kimlik bilgileri girer, THEN THE Auth_Module SHALL açıklayıcı bir hata mesajı göstermelidir.
4. WHEN kullanıcı oturumu kapatır, THE Auth_Module SHALL oturumu sonlandırmalı ve giriş sayfasına yönlendirmelidir.
5. WHILE kullanıcı oturumu aktif değildir, THE Auth_Module SHALL korumalı sayfalara erişimi engellemeli ve giriş sayfasına yönlendirmelidir.
6. WHEN sayfa yenilenir, THE Auth_Module SHALL geçerli oturumu SSR aracılığıyla korumalı ve kullanıcıyı oturumda tutmalıdır.

---

### Gereksinim 2: Dashboard

**Kullanıcı Hikayesi:** Mağaza yöneticisi olarak, günlük operasyonlara hızlı genel bakış istiyorum; böylece kritik durumları anında görebilirim.

#### Kabul Kriterleri

1. THE Dashboard SHALL stoktaki toplam cihaz sayısını, bugünkü satış adedini ve bugünkü toplam satış gelirini göstermelidir.
2. THE Dashboard SHALL v_low_stock_accessories view'ından stok adedi 5 veya altında olan aksesuarları uyarı kartı olarak listelemelidir.
3. THE Dashboard SHALL v_monthly_sales_profit view'ından mevcut aya ait toplam satış tutarını ve net karı göstermelidir.
4. WHEN Dashboard yüklenirken veri çekiliyorsa, THE Dashboard SHALL Optimistic UI prensibiyle iskelet (skeleton) yükleme göstergesi sunmalıdır.
5. THE Dashboard SHALL her özet kartına tıklandığında ilgili modül sayfasına yönlendirmelidir.

---

### Gereksinim 3: Marka, Model ve Varyant Yönetimi

**Kullanıcı Hikayesi:** Mağaza yöneticisi olarak, ürün kataloğunu yönetmek istiyorum; böylece cihaz envanterini doğru kategorize edebilirim.

#### Kabul Kriterleri

1. THE Catalog_Manager SHALL markaları listelemeli, yeni marka eklenmesine, mevcut markanın düzenlenmesine ve silinmesine izin vermelidir.
2. THE Catalog_Manager SHALL modelleri marka bazında listelemeli, yeni model eklenmesine, mevcut modelin düzenlenmesine ve silinmesine izin vermelidir.
3. THE Catalog_Manager SHALL varyantları model bazında listelemeli; renk ve hafıza kombinasyonu ile yeni varyant eklenmesine, düzenlenmesine ve silinmesine izin vermelidir.
4. IF bir marka silinmek istendiğinde o markaya bağlı modeller mevcutsa, THEN THE Catalog_Manager SHALL silme işlemini engellemeli ve kullanıcıyı bilgilendirmelidir.
5. IF bir model silinmek istendiğinde o modele bağlı varyantlar mevcutsa, THEN THE Catalog_Manager SHALL silme işlemini engellemeli ve kullanıcıyı bilgilendirmelidir.
6. WHEN yeni bir varyant eklenir, THE Catalog_Manager SHALL renk ve hafıza alanlarının dolu olduğunu doğrulamalıdır.

---

### Gereksinim 4: Cihaz Envanteri Yönetimi

**Kullanıcı Hikayesi:** Mağaza yöneticisi olarak, fiziksel telefon envanterini yönetmek istiyorum; böylece stok durumunu ve maliyetleri takip edebirim.

#### Kabul Kriterleri

1. THE Device_Manager SHALL stoktaki cihazları v_in_stock_devices view'ından listelemeli; IMEI (varsa), marka, model, varyant, alış fiyatı, vitrin fiyatı ve toplam maliyet bilgilerini göstermelidir.
2. WHEN yeni cihaz eklenirken, THE Device_Manager SHALL model varyantı ve alış fiyatı alanlarının dolu olduğunu doğrulamalıdır; IMEI ve vitrin fiyatı opsiyoneldir.
3. IF IMEI girilmişse, THEN THE Device_Manager SHALL IMEI numarasının tam olarak 15 haneli rakamlardan oluştuğunu doğrulamalıdır.
4. IF çift SIM destekli bir cihaz için ikinci IMEI giriliyorsa, THEN THE Device_Manager SHALL ikinci IMEI'nin de 15 haneli ve birinci IMEI'den farklı olduğunu doğrulamalıdır.
5. THE Device_Manager SHALL cihaza masraf (device_expenses) eklenmesine izin vermeli; masraf türü ve tutarı kaydedilmelidir.
6. THE Device_Manager SHALL cihazın vitrin fiyatının güncellenmesine izin vermeli; fiyat değişimi device_price_history tablosuna otomatik olarak kaydedilmelidir.
7. WHEN bir cihazın vitrin fiyatı güncellenir, THE Device_Manager SHALL eski ve yeni fiyatı yan yana göstermelidir.
8. THE Device_Manager SHALL cihaz detay sayfasında toplam maliyeti get_total_device_cost() fonksiyonu ile, net karı ise get_device_net_profit() fonksiyonu ile hesaplayarak göstermelidir.
9. THE Device_Manager SHALL durum filtresi (IN_STOCK / SOLD / RETURNED) ile cihaz listesini filtrelemeye izin vermelidir.

---

### Gereksinim 5: Aksesuar Yönetimi

**Kullanıcı Hikayesi:** Mağaza yöneticisi olarak, aksesuar stoğunu yönetmek istiyorum; böylece stok tükenmelerini önleyebilirim.

#### Kabul Kriterleri

1. THE Accessory_Manager SHALL aksesuarları listelemeli; barkod, ürün adı, mevcut stok adedi, alış fiyatı ve satış fiyatını göstermelidir.
2. WHEN yeni aksesuar eklenirken, THE Accessory_Manager SHALL barkod, ürün adı, stok adedi, alış fiyatı ve satış fiyatı alanlarının dolu olduğunu doğrulamalıdır.
3. THE Accessory_Manager SHALL barkod numarasının sistem içinde benzersiz olduğunu doğrulamalıdır.
4. THE Accessory_Manager SHALL aksesuar fiyatı veya stok adedinin güncellenmesine izin vermeli; her değişiklik accessory_history tablosuna otomatik olarak kaydedilmelidir.
5. THE Accessory_Manager SHALL stok adedi 5 veya altında olan aksesuarları listede görsel uyarı (kırmızı/sarı rozet) ile işaretlemelidir.
6. THE Accessory_Manager SHALL barkod veya ürün adına göre arama yapılmasına izin vermelidir.

---

### Gereksinim 6: Cari Yönetimi

**Kullanıcı Hikayesi:** Mağaza yöneticisi olarak, müşteri ve tedarikçi bilgilerini yönetmek istiyorum; böylece iş ortaklarımı takip edebirim.

#### Kabul Kriterleri

1. THE Contact_Manager SHALL carileri listelemeli; ad, iletişim bilgisi ve cari tipi (CUSTOMER/SUPPLIER) bilgilerini göstermelidir.
2. WHEN yeni cari eklenirken, THE Contact_Manager SHALL ad ve cari tipi alanlarının dolu olduğunu doğrulamalıdır.
3. THE Contact_Manager SHALL cari tipine göre (CUSTOMER/SUPPLIER) filtreleme yapılmasına izin vermelidir.
4. THE Contact_Manager SHALL v_contact_volumes view'ından cari bazında toplam işlem hacmini göstermelidir.
5. THE Contact_Manager SHALL cari detay sayfasında o cariye ait geçmiş satış işlemlerini listelemeli; tarih, tutar ve ödeme yöntemi bilgilerini içermelidir.
6. IF bir cari silinmek istendiğinde o cariye bağlı satış kayıtları mevcutsa, THEN THE Contact_Manager SHALL silme işlemini engellemeli ve kullanıcıyı bilgilendirmelidir.

---

### Gereksinim 7: Satış İşlemleri

**Kullanıcı Hikayesi:** Mağaza çalışanı olarak, cihaz ve aksesuar satışlarını hızlıca kaydetmek istiyorum; böylece kasayı doğru yönetebilirim.

#### Kabul Kriterleri

1. THE Sales_Module SHALL cihaz satışı için sell_device() fonksiyonunu çağırmalı; cihaz seçimi, satış fiyatı, ödeme yöntemi (CASH/CREDIT_CARD/IBAN) ve fatura tipi (AF/MF) bilgilerini almalıdır; müşteri carisi opsiyoneldir ve seçilmediğinde satış "Perakende" olarak kaydedilmelidir.
2. THE Sales_Module SHALL aksesuar satışı için sell_accessory() fonksiyonunu çağırmalı; aksesuar barkodu ve adet bilgilerini almalıdır; müşteri carisi, ödeme yöntemi ve fatura tipi opsiyoneldir ve cari seçilmediğinde satış "Perakende" olarak kaydedilmelidir.
3. THE Sales_Module SHALL cihaz alışında tedarikçi carisi opsiyonel olmalıdır; tedarikçi seçilmediğinde alış "Perakende" olarak kaydedilmelidir.
3. WHEN aksesuar satışı tamamlandığında, THE Sales_Module SHALL ilgili aksesuar stok adedini otomatik olarak düşürmelidir.
4. WHEN cihaz satışı tamamlandığında, THE Sales_Module SHALL cihaz durumunu IN_STOCK'tan SOLD'a güncellemelidir.
5. IF satış sırasında seçilen cihazın durumu IN_STOCK değilse, THEN THE Sales_Module SHALL satış işlemini engellemeli ve kullanıcıyı bilgilendirmelidir.
6. IF aksesuar satışında talep edilen adet mevcut stoktan fazlaysa, THEN THE Sales_Module SHALL satış işlemini engellemeli ve mevcut stok adedini kullanıcıya göstermelidir.
7. THE Sales_Module SHALL tamamlanan satışlar için satış özeti (ürün, tutar, ödeme yöntemi) ekranda göstermelidir.
8. THE Sales_Module SHALL satış listesini tarih aralığı, ödeme yöntemi ve fatura tipine göre filtrelemeye izin vermelidir.

---

### Gereksinim 8: Raporlama

**Kullanıcı Hikayesi:** Mağaza yöneticisi olarak, finansal performansı ve stok durumunu raporlamak istiyorum; böylece iş kararlarımı veriye dayalı alabilirim.

#### Kabul Kriterleri

1. THE Report_Module SHALL v_monthly_sales_profit view'ından aylık bazda toplam satış adedi, toplam satış tutarı, toplam maliyet ve net kar/zarar bilgilerini tablo ve grafik olarak göstermelidir.
2. THE Report_Module SHALL v_in_stock_devices view'ından mevcut stok değerini (toplam alış maliyeti ve toplam vitrin fiyatı) göstermelidir.
3. THE Report_Module SHALL v_low_stock_accessories view'ından kritik stok seviyesindeki aksesuarları listelemeli; ürün adı, barkod ve mevcut stok adedini içermelidir.
4. THE Report_Module SHALL belirli bir tarih aralığı için satış raporunu filtrelemeye izin vermelidir.
5. WHEN rapor verisi yüklenirken, THE Report_Module SHALL Optimistic UI prensibiyle iskelet yükleme göstergesi sunmalıdır.

---

### Gereksinim 9: Genel UX ve Performans

**Kullanıcı Hikayesi:** Mağaza çalışanı olarak, uygulamanın hızlı ve sezgisel çalışmasını istiyorum; böylece müşteri bekletmeden işlemleri tamamlayabilirim.

#### Kabul Kriterleri

1. THE POS_System SHALL tüm form gönderimlerinde Optimistic UI prensibiyle kullanıcı arayüzünü sunucu yanıtı beklenmeksizin anında güncellemeli; hata durumunda önceki duruma geri dönmelidir.
2. THE POS_System SHALL Shadcn/ui bileşenlerini kullanarak tutarlı bir tasarım dili sunmalıdır.
3. THE POS_System SHALL Next.js SSR ile sayfa ilk yüklemesinde verileri sunucu tarafında çekerek ilk içerikli boyama (FCP) süresini minimize etmelidir.
4. THE POS_System SHALL tüm veri giriş formlarında anlık (inline) doğrulama hataları göstermelidir.
5. THE POS_System SHALL mobil ve masaüstü ekran boyutlarında kullanılabilir (responsive) bir düzen sunmalıdır.
6. IF bir sunucu işlemi başarısız olursa, THEN THE POS_System SHALL kullanıcıya anlaşılır bir hata mesajı göstermeli ve işlemi yeniden deneme seçeneği sunmalıdır.

---

### Gereksinim 10: Hızlı Düzenleme Panelleri ve Klavye Kısayolları

**Kullanıcı Hikayesi:** Mağaza çalışanı olarak, cihaz ve aksesuar bilgilerini sayfadan ayrılmadan hızlıca düzenlemek ve sık kullanılan işlemlere klavye kısayollarıyla erişmek istiyorum; böylece işlemleri çok daha hızlı tamamlayabilirim.

#### Kabul Kriterleri

1. THE POS_System SHALL cihaz listesinde bir satıra tıklandığında sağdan kayan bir panel (Sheet) açmalı; bu panel cihazın tüm düzenlenebilir alanlarını (vitrin fiyatı, durum, notlar vb.) içermelidir.
2. THE POS_System SHALL aksesuar listesinde bir satıra tıklandığında sağdan kayan bir panel (Sheet) açmalı; bu panel fiyat ve stok güncelleme formlarını içermelidir.
3. THE POS_System SHALL yeni satış başlatmak için `N` kısayolunu, yeni cihaz eklemek için `D` kısayolunu, yeni aksesuar eklemek için `A` kısayolunu desteklemelidir.
4. THE POS_System SHALL açık bir panel veya modal'ı kapatmak için `Escape` tuşunu desteklemelidir.
5. THE POS_System SHALL klavye kısayollarının yalnızca form alanı odakta değilken tetiklenmesini sağlamalıdır.
6. THE POS_System SHALL mevcut kısayolları gösteren bir yardım göstergesi (`?` tuşu veya footer'da) sunmalıdır.
