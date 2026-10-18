> Güncel karar · 18 Ekim 2026: Randevu kaydedildiği anda kararlaştırılmış tutar Kasa → Alacaklar ve müşteri hesabına dahil edilir. Bekleyen talep iptal gerekçesiyle iptal edilince alacak düşer. Programa alınan talep bağlı iş üzerinden yalnız bir kez sayılır; iş iptali alacağı kaldırır. Erteleme alacağı kaldırmaz. Tahsilat yalnız iş tamamlandıktan sonra açılır. Ödemeli iş iptali engellenir; ödeme silinmez, gerekçeli düzeltme gerekir. Eski bağımsız iş emirleri tamamlanınca alacak oluşturur. Bu karar aşağıdaki önceki “yalnız tamamlanan işler” kuralının yerini alır. Yeni tablo/migration gerekmez; mevcut randevu ve iş kayıtları esas alınır.

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

## Yeni ekran yerleşimi — 17 Ekim 2026
Ana menü: Bugünkü işler, Müşteriler ve tarlalar, Randevular, Kasa, Ayarlar. Operatörde yalnız Bugünkü işler ve İşlerim. Müşteriler ve tarlalar tek alanda iki sekme; fiyat, ekip/depo ve drone ayarlarda. Gelişmiş araçlarla eski takvim, tüm iş emirleri ve araştırma erişilebilir.
Randevular önce liste olarak açılır. + Yeni randevu ile 1) müşteri/tarla ve harita, 2) gün/saat, 3) fiyat/kaydet adımları açılır. Geri dönüldüğünde bilgiler korunur; başarısız kayıtta form kapanmaz. İlk adımda + Yeni tarla kaydet ile müşteri/tarla ekranı aynı akışta açılır, Randevuya dön ile kayıtlar yenilenir. Dekar parsel sınırından gelir; elle girilmez.
Bugünkü işlerde devam eden iş, yoksa başlangıç saatine göre sıradaki planlı iş vurgulanır. Telefon, yerinde harita gösterme ve işi aç/başlat aksiyonları bulunur. İşi açmak otomatik operasyon kaydı oluşturmaz; hazırlık başlangıcı iş ekranından onaylanır.

## Tek seçimle otomatik fiyat
Ayarlar → Birim fiyatlar bölümünde örneğin Mantar ilacı adı ve TL/dekar bedeli kaydedilir. İlaç türü ve dekar birimi yeni kayıtta hazır gelir. Randevuda tarla seçildikten sonra fiyat adımında ilaç açılır listeden seçilir; sunucu parsel alanı × tanımlı birim bedeli otomatik hesaplar. Hesapla düğmesi veya elle alan girme yoktur. Ek kâr varsayılan %0; isteğe bağlı ayrıntı bölümünden belirlenebilir. Önceki maliyet üzerine kâr, çoklu kalem, litre/kg ve toplam miktar yöntemleri aynı bölümden erişilebilir. Sistem ilaç/doz seçmez; kullanıcı seçer. Kaydetmeden önce toplam ve tarife sürümü yine sunucuda doğrulanır. Eski kayıtların fiyatları değişmez.

## Tek kişi düzeni
Ekip ayarları sekmesi ve çoklu ekip seçimi kaldırıldı. Günlük rota kayıtlı ilk aktif çalışma kaydındaki kişi/drone'u otomatik kullanır. Yeni ekip oluşturma veya ekip adı girme arayüzü yoktur. Ayarlar → Depo ve çalışma bilgileri → Tek kişi çalışma bilgileri bölümünden kişi, drone, çalışma saatleri ve süre katsayıları bir kez kaydedilir; sonraki kayıtlarda aynı kayıt güncellenir. Depo ekranında ayrıca ekip seçilmez. Yeni doğrudan iş emrinde kişi sayısı 1'dir. Eski kayıtlar ve geçmiş iş snapshot'ları silinmez; eski çoklu kayıtlar varsa otomatik seçim oluşturulma sırasındaki ilk aktif kayıttır.

## 18 Ekim — Geçici başlangıç: Seydişehir merkez
Başlangıç noktası kullanıcı isteğiyle 37.419 enlem, 31.849 boylamdaki yaklaşık Seydişehir merkez noktasıdır. Telefonun canlı konumu değildir; konum izni alınmaz. Depo adı/konumu seçimi kaldırıldı. Yol matrisi bu başlangıcı APPROXIMATE_DISTRICT_CENTER, seydisehir-center-v1 sürümü ve isLiveLocation=false ile snapshot olarak saklar. Yol eşleme mesafesi kontrolü sürer; harita noktası araç park yeri/erişim teyidi sayılmaz. Mevcut günlük planlama son işten başlangıca dönüşü de hesaba katar; bu süre Seydişehir merkeze dönüştür. Eski onaylı planlar değiştirilmez. İleride kullanıcının izinli konumu için bu başlangıç sağlayıcısı değiştirilebilir; henüz canlı konum entegrasyonu yok.


## 18 Ekim — Merkeze göre basit günlük sıra (güncel akış)
Günlük rota artık seçilen güne uygun bekleyen randevuları Seydişehir merkeze kuş uçuşu uzaklığa göre artan sıralar. En yakın 1., daha uzak 2. olur. Giriş noktası, depo, çalışma profili veya harici yol servisi gerektirmez. Temsil noktası parsel geometrisinden pointOnFeature ile elde edilir; araç girişi iddiası yok. Geometrisi eksik/geçersiz tarla sıfır mesafe sayılmaz, ayrı açıklanır. Liste yazdırılabilir. Bu ekran saatli program onayı veya yolculuk süresi üretmez; müşterinin uygun saatleri satırda gösterilir. Önceki saatli program ayrı isteğe bağlı bölümde korunur. APPROXIMATE_DISTRICT_CENTER başlangıcı ve STRAIGHT_LINE mesafe türü yanıtta açıktır.

## Müşteri hesabı ve iş sonu ödeme
1. Müşteriler ve tarlalar → Müşteriler → Hesap / ödeme al: müşterinin tamamlanan işlerini, ödemelerini ve kalan borcunu görün.
2. İşi tamamlayan yönetici ödeme bölümüne yönlenir. Tamamı ödendi / Kısmi ödeme al / Veresiye seçilir. İşin tamamlanması, ödeme alınmasına bağlı değildir.
3. Ödeme alırken tutar, yöntem ve tarih girilir; Dağılımı göster ile kontrol edilir, Ödemeyi kaydet ile kaydolur. Birden fazla işte varsayılan en eski açık borçtan başlanır; dağılım değiştirilebilir. Fazla ödeme kabul edilmez.
4. Veresiyede ödeme yapılmış sayılmaz. Vade isteğe bağlıdır; vadesi geçen açık borç Kasa'da belirginleşir.
5. Kasa → Alacaklar / Tahsilatlar / Giderler. Tahsilatları müşteri ve tarihe göre filtreleyin.
6. Yanlış kayıtta müşteri hesabından Ödemeler → Düzelt kullanın. Gerekçe zorunludur; önceki değer saklanır. Bu işlem gerçek banka iadesi yapmaz. Finans işlemlerini yalnız yönetici kullanır.
7. Yalnız tamamlanmış işler borç oluşturur. Henüz talep/program aşamasındaki kayıtlar alacak listesine eklenmez. Gerçek işletme verisinde deneme ödemesi kaydetmeyin.

## Google Maps durak aktarımı
Günlük rota ekranındaki Google Maps güzergâhı bölümünde sırayı kontrol edin, konum paylaşma onayını işaretleyin ve bağlantıya basın. Uzun listede 1. bölüm, 2. bölüm şeklinde sırayla açın; her bağlantı en çok 4 hedef taşır. Son tarladan merkeze dönüş isteğe bağlıdır. Cihaz ara durakları göstermiyorsa Tek tek tarlaya git bölümünü kullanın. Bağlantıyı açmak işi başlatmaz/bitirmez veya randevuyu onaylamaz. Yol tarifi tarla temsil noktasına yönelir, giriş noktası garanti edilmez.
