# Planlama çalışma durumu — 16 Ekim 2026

## 17 Ekim2026 — Depo/giriş ve otomatik yol planı bağlandı
Son görsel kontrol: masaüstü ve390 px mobil görünümde teyit kutuları düzeltildi; yatay taşma yok. Mobil ekran .local/verification/road-access-mobile.png içinde. Geçen son test sayısı58; derleme/typecheck ve son kaynakla yol/çekirdek PostgreSQL E2E tekrar geçti. API yolu eşleme uzaklığı için eksik metadata ve varsayılan200 m üstü sonuçlar reddedilir.24 ziyaret + depo dönüşünün26 noktalı Directions isteği ayrıca test edildi. Tarayıcı giriş ekranında onay kutuları işaretlenmedi, gerçek tarla/depo teyidi veya ORS işletme konum aktarımı yapılmadı.
Güncel kullanım ROAD_WORKFLOW.md içinde. Yönetici haritada depo ve araç girişini teyit edebilir; kullanıcıdan sayısal koordinat veya sınır çizimi istenmez. ORS Snap yol adayı açık koordinat aktarımı onayıyla alınır; aday teyitli giriş sayılmaz. Depo/girişte gerekçe, kullanıcı/zaman ve geometri hash'i saklanır.

Migration20261017230000_road_access_matrices gerçek Supabase saha şemasına additive uygulandı. fields.roadAccess, planning_profiles.baseLocation, travel_matrices ve travel_routes eklendi; FK Restrict, RLS açık ve Data API rolleri kapalı. Reset veya gerçek işletme içinde sentetik randevu/ekip/matris oluşturma yapılmadı.

Gün planında API veya manuel yol kaynağı seçilir. API matrisi kullanıcı onayıyla yalnız teyitli koordinatları gönderir; kalıcı girdi/sürüm snapshot'ı ve15 dakika cache vardır. Giriş, geometri, depo, profil veya talep değişirse eski matris reddedilir. Erişilemeyen yol null kalır. Yol eşleme bilgisi eksikse veya ayarlı varsayılan200 metreden uzağa eşlenmişse otomatik plan reddedilir. Matrix kaynak/mesafe bilgileri kamuya açık örneklerle canlı doğrulandı.

API süreleriyle taslak ve sıra önerisi çalışır; kaynak OPENROUTESERVICE olarak sunucuda belirlenir, manuel süreyle aynı taslakta karıştırılmaz. Atomik onay öncesinde kaynaklar yeniden kontrol edilir. Kayıtlı plan için Directions LineString mavi çizgiyle gösterilir ve plan/ekip başına değişmez saklanır. Atanan operatör kendi işinden kayıtlı ekip güzergâhını okuyabilir; başka operatörün işi403. Eski iş emri ekranından API ziyaret saat/sıra/yol süresi sessizce değiştirilemez; yeni yol hesabı/plan gerekir.

Doğrulama:58 test, typecheck/build geçti (mevcut >500kB paket uyarısı sürüyor). Son kaynakla ayrı geçici PostgreSQL'de7 migration ve yol/randevu/operasyon/finans E2E geçti.20 tablo/RLS, tekrar SQL kurulumunda veri korunması ve Prisma uyumu test edildi. Sentetik ORS yanıtlarıyla depo/giriş eksikliği, onaysız istek, cache, süresi geçmiş/değişen matris, API plan onayı, LineString, kaynak türü ve operatör yetkisi doğrulandı. Gerçek ORS Snap servisi kamuya açık doküman örneğinde aday döndürdü. İşletmeye ait konum ORS'ye gönderilmedi. Profil katsayıları/depo/giriş teyidi işletmeci tarafından girilmeli; gerçek tarla yolu pilotu henüz yok.

Uygulama localhost:5173 üzerinde Supabase ile güncel derlemeyle açık bırakılır. Tarayıcıda gerçek kayıtlı tarlanın sınırı ve onaysız/eksik girişte pasif düğmeler görüldü; gerçek giriş teyidi bizim tarafımızdan kaydedilmedi. Ekran görüntüsü .local/verification/road-access.png git dışındadır.

Sonraki ilk eksik işler: P2 ayrıntılı saha koşulları/teyitleri; P7 kapsamlı gün içi plan revizyonu ve paylaşılan araç/çok kişili ekip modeli; P8 gerçek pilot/ölçüm. Temel API yol entegrasyonu artık bekleyen iş değildir. Araştırma ve veri aktarımı betiklerinde yeni tabloları kapsayan özel yedek genişletmesi ayrıca bekler. Anahtarlar kaynak koda konmadı, commit/push yapılmadı.

## 17 Ekim 2026 — ORS anahtarı ve canlı test tamamlandı
Kullanıcı anahtarı .env içine ekledi. Değeri gösterilmeden varlığı doğrulandı. Resmî dokümanların kamuya açık örnek noktalarıyla Matrix200 ve Directions GeoJSON başarılı. İşletme verisi/konumu gönderilmedi. Directions406 sorunu Accept başlığı application/geo+json yapılarak düzeltildi; regresyon testine başlık kontrolü eklendi.55 test ve build/typecheck geçti. Önceki “anahtar bekleniyor” durumu kapandı. Bundan sonraki iş hâlâ depo ve teyitli tarla girişleri, konum aktarımı kapsamı, kalıcı matris ve günlük plana bağlama. API bağlantısı aktif olsa da mevcut günlük plan manuel yol sürelerini kullanıyor.

## 17 Ekim 2026 — Devam edildi / OpenRouteService hazırlığı
Kullanıcı devam etti; önceki durma talimatı kaldırıldı. Önceki kaynaklar yeniden typecheck/build ve PostgreSQL E2E ile doğrulandı. suggestDay deterministik öneri, mevcut rezervasyonları atlama ve sığmayan sabit sıranın sonraki talebi kilitlememesi testleri eklendi. Toplam55 test geçti. Operatör hava otomatik yenilemesinin tarayıcı zamanlayıcı testi henüz yok; sunucu rol/atama ve E2E sınırları geçiyor.

OpenRouteService Matrix/Directions sunucu adaptörleri ve /api/roads yönetici uçları eklendi; gün planında yapılandırma durum kartı var. ORS_API_KEY sunucuda kullanılır, kullanıcı hesabı olduğunu ve anahtarı .env içine ekleyeceğini bildirdi. Anahtar varlığı canlı erişim/hesap koşulu doğrulaması anlamına gelmez. İsteğe bağlı ORS_USAGE_AUTHORIZATION_REFERENCE yalnız belge kaydıdır. Gerçek yol API sorgusu yapılmadı, hassas konum ORS'ye aktarılmadı. Anahtar değeri kontrol veya log çıktısına yazılmaz.

55 test: yönlü saniye→dakika/metre, null erişilememe, sabit HTTPS/Authorization, yalnız koordinat aktarımı, Matrix cache, Directions LineString, rol/CSRF, kota/hatalı yanıt. Migration veya gerçek işletme verisi değişikliği yapılmadı. Rota API sonuçları henüz kalıcı seyahat matrisi/plan girdisine bağlanmadı; manuel legs kullanılmaya devam ediyor. Depo ve teyitli giriş noktası akışı eksik. Ayrıntılı kurulum ve kalan bağlantı: ROAD_API_SETUP.md. Sonraki adım kullanıcı anahtarı eklediğini bildirince sunucuyu yeniden başlatmak; hesap koşulu/konum aktarımı kapsamıyla canlı testi yapmak ve doğrulanmış girişler üzerinden planlamaya bağlamak. Eski aşağıdaki “yeniden doğrulama bekliyor” bölümünün algoritma/typecheck/build/E2E kısmı bu güncellemeyle karşılandı; UI tarayıcı kontrolleri ve tam yol entegrasyonu bekler.

Kullanıcı isteğiyle burada duruldu: “burda dur bakacaz burdan sonrasına”. Sonraki çalışma kullanıcı devam talimatından sonra başlamalıdır. Rota servisi hesabı/anahtarı seçilmedi, harici yol servisine tarla konumu gönderilmedi.

## Uygulananlar

- Supabase migration `20261016210000_appointments_planning`: planning_profiles, appointment_requests, daily_plans. İlişkiler Restrict; RLS ve istemci rol erişim kısıtları var. Migration gerçek Supabase saha şemasına veri silmeden uygulandı.
- Yönetici Randevu planlama ekranı: müşteri/tarla, hizmet, istenen gün, tarih esnekliği, birden çok uygun saat aralığı, bedel; talep düzenleme ve gerekçeli iptal.
- Tek kişi varsayılan; yönetici kendi hesabına atanabilir. İsteğe bağlı bağımsız tek kişilik ekip profilleri; ortak kişi/drone engeli. Çok kişili ekip üyeleri/ortak taşıma aracı modeli henüz yok.
- Geometriden alan m²/dekar, hazırlık + alan × etkin dakika/dekar + kapanış profil tahmini. Polygon delikleri ve ayrık MultiPolygon desteği. Katsayılar ve kaynakları işletmeci tarafından bir kez tanımlanır, uydurulmaz. Tam parsel hizmet kapsamı açık gösterilir.
- Manuel yönlü karayolu dakikalarıyla kapasite taslağı, mesai/saat aralıkları, bekleme, dönüş süresi ve dışarıda kalan iş gerekçesi. Gerçek yol servisi/güzergâh çizgisi yok.
- Kaynaklı, sürümlü profil hava politikası: rüzgâr/hamle/yağış/sıcaklık/nem aralıkları; eksik veya bir saatten eski tahmin aday pencere oluşturmaz. Politika kapalıysa otomatik uygunluk iddiası yok, yönetici manuel inceleme gerekçesiyle karar verir. Ücretsiz Open-Meteo araştırma modu sınırı sürer.
- Değişmez taslak girdileri; istek/tarla/profil/hava değişimi kontrolü; Serializable transaction ile onay ve iş/prediction/audit kayıtları. JSONB alan sırası için kanonik hash düzeltmesi.
- Atanan operatöre kendi işinin esnek randevu bilgileri ve saatlik hava görünümü; finans bilgisi verilmez. Hava değişikliği/eski veri uyarıları.

## Geçen kontroller

45 birim/API testi, build/typecheck geçti. Ayrı geçici PostgreSQL'de6 migration ve planlama E2E geçti: talep→taslak→onay→iş emri→operatör hava görünümü, yönetici kendi adına atama, profil değişince eski taslağı reddetme, çift/eşzamanlı onayı engelleme, finans gizliliği. Mevcut operasyon/finans/araştırma E2E de geçti.

Supabase SQL testi geçti:18 tablo (Prisma geçmişi dahil), RLS, Data API rol kısıtları, tekrar çalıştırmada veri korunması ve migration uyumu. Supabase kurulum.sql6 migration içerir. Gerçek işletme veritabanında sentetik randevu/ekip/iş oluşturulmadı.

Tarayıcıda yeni randevu ve ekip profili ekranları açıldı; mevcut yönetici seçimde göründü. Henüz drone/profil/randevu olmadığından işletme verisiyle tam plan onayı yapılmadı; E2E yalnız izole sentetik test DB'sinde yapıldı.

## Son değişiklikler: yeniden doğrulama bekliyor

Geçen kontrollerden sonra şu ekler yapıldı; tamamlandı diye kabul edilmemeli:
1. `suggestDay`: en erken bitiş + en çok100 deterministik2-opt denemesi; `RoadMatrix` ile ek yönlü manuel bağlantılar ve isteğe bağlı sıra önerisi. Yeni öneri mantığına anlamlı test ve tekrar build/E2E gerekli.
2. Operatör hava panelinde60 saniyelik yalnız DB okuma yenilemesi ve politika penceresi değişikliği uyarısı. Yeni davranışın rol/atama, hata ve görünüm kontrolleri gerekli.
3. Mevcut işlerin yol/saha/dönüş rezervasyonlarının taslak kapasitesine ve onay kontrolüne eklenmesi; yeniden programlamada randevu/politika sınırı. Typecheck çalıştırıldı; bu son sürüm için sınır/çakışma ve E2E tekrar gerekli.

Uygulama localhost:5173 üzerinde Supabase ile açık bırakıldı; çalışan derleme yukarıdaki son üç eki içermeyebilir. Son devamda önce kaynakları/typecheck sonuçlarını kontrol et, son ekleri test et, build al ve yalnız bu projeye ait API/web süreçlerini yeniden başlat. Prisma generate gerekiyorsa çalışan API DLL'yi kilitleyebilir; önce ilgili API durdurulmalı. İşletme DB resetlenmez.

## Sonraki sıra

Önce son eklerin doğrulaması ve belgelerin çelişen eski durumlarının temizlenmesi. Sonra P2 tarla erişim/giriş noktası ve teyitli saha koşulları; P5 gerçek yönlü yol matrisi servisi seçimi/erişim koşulları/anahtar ve konum aktarımı; P6 bununla sıra önerisi ve yol çizgisi; P7 gün içi revizyon ve kapsamlı ekip/araç kaynakları; P8 gerçek pilot. Bütün ROUTE_PLANNING_PLAN.md tamamlanmış değildir.

Gerçek servis ve saha pilotu sonuçları uydurulmaz. Açık soruya kullanıcı durma talimatı verdiği için tekrar servis hesabı sorulmaz; devam isteği beklenir. Git commit/push yapılmadı. Yeni hava/planlama tabloları eski yerel aktarım yedek betiği kapsamına henüz eklenmedi; bunun genişletilmesi de bekler.

## 17 Ekim — fiyatlandırma teslimi
Birim fiyatlar sekmesi eklendi; dekar/litre/kg/sabit kalem ve maliyet üzerine kâr yüzdesi ile randevu ve yeni iş emrinde otomatik fiyat. Kimyasal seçimi/doz önerisi yok. Yeni migration: 20261018010000_pricing (price_items, appointment_requests.pricingSnapshot); geçmiş işin finans snapshot'ı korunur. 64 birim testi, build/typecheck, 21 tablo/RLS/tekrar çalıştırma SQL testi ve PostgreSQL uçtan uca senaryoları geçti. Fiyat testleri rol sınırı, alan hesabı, Decimal, eski tarife reddi, snapshot korunması ve operatör finans gizliliğini içerir. Gerçek tarife girilmedi; işletme kendi maliyetlerini ekleyecek. Ayrıntılar README ve DATA_SPEC içinde.

Sade saha arayüzü tamamlandı (17 Ekim 2026): SADE_KULLANIM.md günlük kullanım rehberidir. Operatör hava tablosu yerine iş/hizmet/saat/konum ve kayıt aksiyonlarını görür. Yönetici teknik araçlara isteğe bağlı ulaşır. Günlük iş listesi yazdır/PDF destekler; istemci gerçek saha verisi olmadan sentetik SSR senaryosuyla doğrulandı. 65 test ve build geçti. Önceki pilot/kurulum eksikleri devam ediyor.
