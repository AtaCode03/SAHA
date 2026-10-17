# SAHA — Sade kullanım rehberi

17 Ekim 2026

## Günlük kullanım
1. Müşteriyi ve tarlasını kaydedin.
2. Randevu ve rota → Randevu talepleri ekranından günü ve müşterinin uygun saatlerini girin.
3. Maliyet kalemlerini seçin. Sistem alan üzerinden maliyeti ve belirlediğiniz kârla son fiyatı hesaplar. Ayrıntılı hesap isteğe bağlı açılır.
4. Günlük rota ekranında günü, ekibi ve işleri seçin; yol sürelerini alın, İş sırasını hazırla düğmesine basın.
5. Günlük iş listesinde sıra, saat, müşteri/telefon, adres, hizmet, alan ve tahmini süre görünür. Taslak veya onaylı olduğu açıkça yazılıdır. Onaydan önce işleri ve saha koşullarını kontrol edip kısa not bırakın.
6. Yazdır / PDF kaydet ile günlük listeyi alın. Bu belge müşteri telefonu ve konum bilgisi içerdiğinden yalnız ilgili çalışanla paylaşın; araştırma çıktısı değildir.
7. Çalışan kendi işini açar, müşteriyle iletişim kurar, konumu görür. Hazırlığa başlar; uçuş, dolum, batarya veya beklemeyi kaydeder ve işi tamamlar. Uçuş/bekleme açıksa önce onu bitirir. Kaydetme başarılı olmadan işlem tamamlandı sayılmaz.

## Sadeleştirilenler
- Operatör iş ekranındaki hava tablosu kaldırıldı. Hava verisini incelemek operatörün günlük görevi değil.
- Ana menüde hava ayrıntıları ve araştırma gizlendi; yönetici Gelişmiş araçlar ile ulaşabilir.
- Ekip/depo ayarları Randevu ve rota → İlk kurulum / ayarlar altında. Genelde tek kişiyle çalışma devam eder.
- İş ekranında hizmet, alan, saat, konum ve büyük işlem düğmeleri öne çıkarıldı.
- İşlem saati/kaynak seçenekleri, süre dökümü ve kayıt geçmişi kapalı ayrıntı bölümlerine taşındı. Düzeltme gerekçesi ve geçmişi korunur.
- Günlük rota sonucu sade bir iş listesi oldu. Teknik yol/hava incelemesi ayrı açılır bölümde; operatöre hava tablosu verilmez.
- Son fiyat önde, maliyet ve kâr dökümü açılır bölümde.

## İlk kurulum
Yönetici gerçek birim maliyetleri, drone'u, ekip çalışma saatlerini ve süre katsayılarını tanımlar. Depo ve araç giriş noktaları bir kez teyit edilir. Sistem ilaç/doz önermez. Varsayılan eşik veya gerçekmiş gibi fiyat eklenmez.

## Korunan sınırlar
Hava verisi ve sunucudaki planlama kontrolleri kaldırılmadı. Hava politikası tanımlıysa aynı kontroller sürer; eksik veya eski veri uygun hava diye gösterilmez. Plan kesin uçuş izni değildir. Yol API'sine konum gönderme onayı sürer. Başarısız kayıtlar hata gösterir; form korunur. Operatör yalnız atanmış işlerini görür ve finans yönetemez.

## Kalan işler
Gerçek işletme tarifesi, ekip/depo kurulumu ve gerçek saha pilotu işletme tarafından yapılmalı. Otomatik bildirim/WhatsApp gönderimi ve ileri rota optimizasyonu bu değişikliğe dahil değil. Gerçek model başarısı iddiası yok.
