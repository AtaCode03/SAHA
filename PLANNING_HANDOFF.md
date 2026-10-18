> Güncel karar · 18 Ekim 2026: Randevu kaydedildiği anda kararlaştırılmış tutar Kasa → Alacaklar ve müşteri hesabına dahil edilir. Bekleyen talep iptal gerekçesiyle iptal edilince alacak düşer. Programa alınan talep bağlı iş üzerinden yalnız bir kez sayılır; iş iptali alacağı kaldırır. Erteleme alacağı kaldırmaz. Tahsilat yalnız iş tamamlandıktan sonra açılır. Ödemeli iş iptali engellenir; ödeme silinmez, gerekçeli düzeltme gerekir. Eski bağımsız iş emirleri tamamlanınca alacak oluşturur. Bu karar aşağıdaki önceki “yalnız tamamlanan işler” kuralının yerini alır. Yeni tablo/migration gerekmez; mevcut randevu ve iş kayıtları esas alınır.

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

## 17 Ekim — Form uyarısı düzeltmesi
Tarla düzenlerken roadAccess gibi sunucuya ait ek kayıt alanlarının strict doğrulamaya geri gönderilmesi engellendi; yalnız düzenlenebilir alanlar gönderilir. Genel “Alanları kontrol edin” yerine sunucunun alan bazlı hata ayrıntıları Türkçe alan adlarıyla gösterilir. 68 test ve build/typecheck geçti. Kullanıcı belirttiği DOM seçicisi form hata kutusunu gösteriyordu; gerçek form değerleri paylaşılmadığından o istekteki hatalı alan kesinleştirilemedi. Yerel düzeltme hazır.

## 17 Ekim — Parselden otomatik dekar
Tarla kaydında parsel sınırı varsa alan geometri üzerinden 0,001 dekar hassasiyetinde hesaplanır ve kaydedilir (EXTERNAL). Liste API'si eski sınırı olan kayıtlarda da hesaplayarak döndürür. İş emri formunda planlanan alan ve alan kaynağı elle giriş kontrolleri kaldırıldı. Fiyat hesabı aynı geometriyi kullanır. Sınır yoksa mevcut manuel geçmiş değer korunur; yeni otomatik alan üretilmez. Tarihsel iş snapshot'ları değişmez.

## 17 Ekim — Yerleşim yenilendi
Ana menü 5 temel bölüme indirildi. Müşteriler/tarlalar sekmeli ortak alanda, tarife/ekip/depo/drone ayarlarda. Randevular listeyle açılır; 3 adımlı AppointmentWizard müşteri+tarla/harita → gün+saat → fiyat+kaydet akışını kullanır. Yeni tarla ekleme aynı akış içinden açılır. NextJob kartı devam eden işe öncelik verir, ardından en erken planlanan işi gösterir; müşteri arama/konum/iş açma işlemleri sunar. İşe açma otomatik hazırlık kaydı değildir. Build/typecheck ve 70 test geçti. Gerçek işletme tarife/ekip ve saha pilotu eksikleri devam ediyor.

## 17 Ekim — Basit ilaç tarifesi ve otomatik fiyat
PriceMenu yeni kalemde CHEMICAL/DEKAR hazır gelir, isim ve TL/dekar bedeli öndedir. Tür/farklı birim gelişmiş bölümde. Randevu ve iş emri PriceCalculator'da tek ilaç/hizmet seçimi alan × bedeli otomatik sunucudan getirir. Ek kâr varsayılan %0, ayrıntıdan değişebilir; çoklu kalem/litre/kg eski hesaplayıcıyla erişilebilir. Seçim/alan değişirken eski toplam anında geçersizleştirilir; geç dönen yanıtlar kullanılmaz. Gerçek tarife uydurulmadı. 70 test geçti. Önceki fiyat snapshot/Decimal/sunucu doğrulama sözleşmesi korunur.

## Tek kişi ekranları (17 Ekim)
Kullanıcı isteğiyle ekip ayar sekmesi ve çoklu ekip kontrolleri kaldırıldı. Günlük rota ilk aktif profile otomatik bağlanır; aynı profil tek kişi çalışma bilgileri altında güncellenir, geçmiş profiller silinmez. Depo seçimi otomatik, yeni doğrudan işte crewSize=1. Eski sunucu sözleşmesi ve tarihsel kayıtlar korunur. 70 test geçti; build/typecheck kontrol edildi.

18 Ekim 2026: başlangıç kullanıcı kararıyla yaklaşık Seydişehir merkez (37.419,31.849). Depo seçimi kaldırıldı. server/planning-start.ts tek başlangıç sabiti; roadInputs profildeki eski baseLocation yerine bunu kullanır ve matris giriş hash/snapshot'ına alır. Eski matrisler yeni başlangıçla uyuşmazsa yeniden alınır; eski onaylı rota snapshot'ları korunur. Canlı GPS yok. 70 birim testi geçti; yeni başlangıç matrisi kontrolü PostgreSQL E2E kapsamına eklendi.

18 Ekim: Randevu talebi ile kesinleşmiş iş ayrımı belirginleştirildi. Talep kaydından sonra günlük program hazırlama bağlantısı ve açıklama gösterilir. Bekleyen kartta Program bekliyor etiketi ve Günlük programa al düğmesi vardır. Bugünkü işler yalnız iş emri oluşmuş, tarihi bugün olan kayıtları listeler; talep kaydı otomatik plan onayı değildir.

18 Ekim — Günlük rota ilk kullanım engeli: çalışma profili olmadığında randevu seçimleri kilitleniyor ancak form ayarlarda gizli kalıyordu. Rota ekranına eksikse açık ilk kullanım formu eklendi. Seçili talepte araç girişi eksikse doğrudan o tarlanın giriş ekranını açan düğme ve rotaya dönüş eklendi. Herhangi bir gerçek çalışma süresi veya teyitli giriş uydurulmadı. İlk kurulumun işletmeci tarafından tamamlanması gerekiyor. 70 test geçti.

18 Ekim — Kullanıcı kararıyla günlük rota ilk ekranı artık yakınlık listesidir. /planning/nearby yönetici endpoint'i günün PENDING taleplerini merkeze kuş uçuşu artan sıralar. Giriş/profil/yol API'si gerektirmez. Eski saatli program isteğe bağlı korunur. Saat/iş emri onayı otomatik yapılmaz. Eksik geometri dışlanır, hata gösterilir. 72 birim testi ve build/typecheck geçti; PostgreSQL endpoint rol/gerçek veri kontrolü eklendi.

Doğrulama: yakınlık endpoint'i PostgreSQL uçtan uca testinde veri döndürdü; operatör erişimi 403, yalnız yönetici listeleyebilir. Tarla giriş teyidi/çalışma profili olmadan yakınlık sırası üretildi. Eski saatli program testleri de geçti.

## 18 Ekim — Sonraki çalışma: müşteri hesabı ve tahsilat
Kullanıcı yalnız planın kaydedilmesini istedi; uygulama başlatılmadı. Güncel plan CUSTOMER_ACCOUNT_PLAN.md dosyasında. Sonraki devam talimatında bu planın 1. adımı olan mevcut finans modeli/API/test incelemesinden başlanacak. Öncelik iş sonu tam/kısmi ödeme/veresiye, müşteri bakiyesi ve alacak listesi; sonra toplu ödeme dağıtımı. Fazla ödeme, iade ve tedarikçi borcu ikinci aşamada. Mevcut yerel değişiklikler korunacak; veritabanı resetlenmeyecek.

## 18 Ekim 2026 — Müşteri hesabı ilk aşama tamamlandı
Güncel finans uygulaması server/accounts.ts, src/Accounts.tsx, migration 20261018030000_customer_accounts. Müşteri hesabı, Kasa alacak/tahsilat/gider sekmeleri, iş sonu tam/kısmi/veresiye, toplu ödeme dağıtımı, sürümlü gerekçeli düzeltme ve audit eklendi. Yalnız COMPLETED işler alacak oluşturur; mevcut kayıtlar silinmedi. Yeni migration Supabase saha şemasına uygulandı. 78 test; PostgreSQL finans+eski akış E2E, 22 tablo/RLS/SQL tekrar çalıştırma geçti. Gerçek işletme pilotu bekliyor; kaynak veriye sahte ödeme eklenmedi.
Google Maps'e durak aktarımı kullanıcının isteğiyle yalnız planlandı: GOOGLE_MAPS_ROUTE_PLAN.md. Mobil limitler ve URL uzunluğu nedeniyle numaralı parça önerisi, dış konum aktarımında kullanıcı tıklaması ve veri minimizasyonu belgeli. Harici Maps'e gerçek veri gönderilmedi. Sonraki geliştirme talebinde bu plan veya finans ikinci aşama kapsamı kullanıcı isteğine göre ele alınacak.

Son doğrulama notu: canlı tarayıcıdaki mevcut sekme erişimi tarayıcı URL güvenlik politikasıyla engellendi; alternatif yüzeyle aşılmaya çalışılmadı. Bu turda görsel canlı QA yapılmadı. UI durumları render testleriyle, finans yazımları izole PostgreSQL/API senaryolarıyla doğrulandı. Gerçek müşteri hesabına deneme tahsilatı eklenmedi. Uygulama localhost:5173 üzerinde Supabase ile başlatıldı. Build istemci paketi 500 kB uyarısı veriyor; derleme başarılı, kod bölme ayrı iyileştirme.

## 18 Ekim — Google Maps planı uygulandı
src/google-maps-routes.ts saf URL/parça oluşturucu; src/GoogleMapsStops.tsx günlük sıra entegrasyonu. 4 hedef/bağlantı, bölüm zinciri, opsiyonel dönüş, tek tek yol tarifi yedeği. Varsayılan onaysız bağlantılar href taşımaz; Google SDK/iframe veya sayfa açılışında Google isteği yoktur. URL yalnız koordinatlar ve sabit yön parametrelerini taşır. Mevcut yönetici API sınırı değişmedi. Tüm 85 test, typecheck/build geçti. Gerçek telefonda/masaüstünde Google Maps ara durak kabulü doğrulanmadı; gerçek müşteri konumları dış servise gönderilmedi. Mevcut günlük sıra saatli program onayı değildir; bu işleyiş korunur. Veritabanı migration gerekmedi. Sonraki kontrol: kullanıcıyla cihaz üzerinde aktarım teyidi. Önceki belgelerdeki yalnız plan ifadesi bu notla güncellendi.

18 Ekim randevu alacağı kontrolü: build/typecheck, 86 birim/SSR testi ve izole PostgreSQL uçtan uca akışı geçti. Yeni kontroller: talepte alacak, iptalde düşüm ve audit, programa dönüşümde çift saymama, program iptali. Supabase şemasında değişiklik yok. Canlı tarayıcı görsel kontrolü yapılmadı.
