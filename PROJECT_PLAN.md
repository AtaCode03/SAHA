# Seydişehir tarımsal drone hizmeti

## Çalışma ilkesi

Tek işletme, Türkçe mobil panel; gerçek veri PostgreSQL'de. Tahmin veya tasarruf başarısı vaat edilmez. Her devam talimatında ilk tamamlanmamış aşamadan ilerlenir. Veritabanı resetlenmez.

## Aşamalar

1. [x] Altyapı, Prisma migration, güvenli oturum, yönetici/operatör sınırı, çalışan giriş.
2. [x] Müşteri, tarla/Leaflet/GeoJSON, drone, iş emri snapshot ve çakışma kontrollü günlük program. Bu aşamaya kadar ML yok.
3. [x] Operasyon olayları/aralıklar, düzeltme denetimi, finans/rapor ve uçtan uca kontroller.
4. [x] Ayrı işletme CSV ve yöneticiye özel anonimleştirilmiş araştırma paketi.
5. [ ] Tekrarlanabilir bağımsız Python eğitim/değerlendirme hattı ve tahmin sözleşmesi; manuel ulaşım süreli sıra önerisi.
6. [ ] Gerçek saha verisiyle eğitim, bağımsız test, belirsizlik incelemesi ve saha pilotu — veri erişimine bağlı.

## Ortam incelemesi (14 Ekim 2026)

Klasör boş; AGENTS.md yok. Node 25.8.0/npm 11.11.0 mevcut. Docker ve psql bulunamadı. Önerilen çalışma sürümü Node 24 LTS. PostgreSQL gerektiren kontroller ayrı işaretlenecek; bellekte demo verisi gerçek veritabanı yerine kullanılmayacak.

## Tamamlanan davranış ve kontroller

### Aşama 1 — altyapı / oturum

Express/React/Prisma kuruldu, lockfile sabitlendi. bcrypt cost 12, 72 UTF-8 bayt sınırı, HttpOnly/SameSite/üretimde Secure cookie, DB oturumu, logout/tüm oturumları iptal, Origin+CSRF ve IP giriş sınırlaması var. Typecheck/build ve API rol/CSRF/oturum testleri geçti; gerçek PostgreSQL E2E giriş ve cookie niteliklerini doğruladı. Giriş ekranı mobil tarayıcıda açıldı; DB bağlantısı olmadığında başarılı giriş gösterilmedi. Üretim ortamı kullanıcı bilgileri sağlanmadı, hiçbir gerçek parola oluşturulmadı.

### Aşama 2 — kayıt / program

Müşteri arama/ekle/düzenle/arşiv, tarla koordinat/Polygon çizim-yükleme, drone aktiflik, iş emri özellik snapshot, günlük sıra ve süre aralığı takvimi API'ye bağlı. GeoJSON/geometri ve takvim sınır testleri, typecheck/build geçti. PostgreSQL E2E tarla güncellemesinin geçmiş iş snapshot'ını değiştirmediğini, ikinci çakışan işin reddedildiğini doğruladı. Harita sağlayıcısı yapılandırılmadı; resmî parsel sorgusu yok.

### Aşama 3 — operasyon / finans

Telefon için büyük olay butonları, aralık durum makinesi, açık aralık ve gelecek/ters zaman kontrolü, idempotency, gerekçeli düzeltme audit'i, partial payment/bedel düzeltme, TL decimal, günlük/iş giderleri ve eşit kuruş dağıtımı uygulandı. Gerçek işlenen alan ve kaynak türü planlanan alandan ayrı; bilinmiyorsa null. Typecheck/build ve 16 izole test geçti. Ayrı PostgreSQL 18.4 test kümesinde migration ve müşteri→tarla→iş→operasyon→tahsilat API E2E geçti. İşletme DB resetlenmedi. Docker Compose PostgreSQL 17.6 başlatılması Docker yokluğu nedeniyle burada denenmedi; aynı migration SQL'i ayrı PostgreSQL'de uygulandı.

### Aşama 4 — araştırma

Yöneticiye özel CSV+manifest+veri sözlüğü+yöntem+eksik veri+deney+paylaşım inceleme dosyaları, ayrı özel işletme CSV, rastgele araştırma kimlikleri ve SHA256 manifest hazır. Typecheck/build/test geçti. PostgreSQL testinde sentetik dışlama ve test kümesinde geçici REAL işaretli fixture ile dolu paketin hassas alan taşımaması kontrol edildi; fixture gerçek saha gözlemi değildir ve dışarı paylaşılmadı. Kesin tarih/konum ve kimlik eşleştirmesi dışarı çıkmaz; otomatik yayın/DOI yok. Nadir özellikler için insan risk incelemesi paylaşım öncesi gerekli.

### Aşama 5 — yazılım hattı / planlama

Web'de yalnız gerçek geçmiş işlerden baseline/null snapshot. Gerçek doğrulanmış ML yok, AI etiketi yok. Ayrı Python eğitim/doğrulama/test hattı, Ridge/RandomForest, MAE/medyan/dağılım/alan grubu/görülmemiş tarla/tahmin zamanı/öğrenme eğrisi hazır. Python eğitim ve SYNTHETIC smoke dosyalarının sözdizimi geçti. Ayrı ortam paketleri kısmen indirildi; SciPy indirmesi tamamlanmadığı için runtime smoke testi çalıştırılmadı. Arka plan indirmeleri durduruldu; sonraki devamda yerel wheel dosyalarıyla kurulum tamamlanıp smoke çalıştırılmalı. Manuel sıra/süre/ulaşım taslağı var; rota optimizasyonu veya müşteri zaman aralığı entegrasyonu değildir.

## Sonraki çalışma

İlk tamamlanmamış iş: aşama 5 Python smoke doğrulamasını tamamla ve sonucu burada kaydet. Sonra aşama 6 veri erişimi, toplama/pilot ve gerçek değerlendirme. research/private/wheels içindeki tamamlanan paketler yeniden indirilmeden kullanılabilir: pip install --find-links research/private/wheels -r research/requirements.txt (ayrı venv içinde). Üretim DB/.env, işletme kullanıcıları, harita sağlayıcısı ve gerçek drone dosya formatı işletmeden edinilecek. Gerçek veriye erişim olmadan model eğitimi/pilot başarı iddiası yapılmayacak. Müşteri zaman pencereli rota optimizasyonu ayrıca sonraki isteğe bağlı aşama; mevcut plan manuel düzenlenebilir.

## Güvenlik ve doğrulama sınırları

`npm audit` (tüm paketler) ve `npm audit --omit=dev` 0 açık raporladı. Prisma CLI için deepmerge-ts 8.0.2 override uygulanıp generate/migrate ile doğrulandı. Taşınabilir PostgreSQL yalnız dev/test bağımlılığıdır; üretim Docker PostgreSQL kullanır. UI'da oturum açıldıktan sonraki bütün ekranlar tarayıcı E2E ile sınanmadı; kayıt akışı gerçek PostgreSQL üzerinde API E2E ile doğrulandı. TLS/proxy, yedek geri yükleme, Node 24 LTS ve gerçek işletme ortamı pilotta sınanacak.


Son nihai kontrol: npm run build, npm test (16/16), npm run test:postgres (2 migration, rol/atama, snapshot, zaman aralıkları, düzeltme, tekrar isteği, eşzamanlı takvim/ödeme, kuruş dağıtımı, gerçek işlenen alan, baseline/null ve dolu/boş hassas veri dışlama) geçti. Giriş ekranı 1280 px ve 390 px tarayıcıda gözlendi; mobil yatay taşma yok. Gerçek işletme ortamı ve oturum sonrası UI tarayıcı E2E henüz denenmedi.

## 14 Ekim 2026 — Yerel çalıştırma
Kullanıcı internet yayını istemediğini, build/run lokal istediğini belirtti. npm run local eklendi. Kalıcı localhost PostgreSQL 55440, derlenmiş Express API 3001 ve Vite preview 5173 çalıştırıldı. Yönetici hesabı yonetici@local.test oluşturuldu; rastgele parola gitignored .local/GIRIS_BILGILERI.md dosyasına yazıldı, loglanmadı. Arayüz 200, DB health, yönetici login, rapor 200 ve logout doğrulandı. npm start derlenmiş dosya yolu dist-server/index.js olarak düzeltildi. Gerçek saha veya sentetik seed kaydı eklenmedi. İnternet yayını yapılmadı. Yerel başlangıç veritabanını veya parolayı resetlemez.


## 15 Ekim 2026 — Windows yerel başlatma düzeltmesi
Önceki PostgreSQL oturumunun Windows konsol kapanışında 0x40010004 ile kesildiği günlükte görüldü. Mevcut küme normal başlatmada toparlandı; reset yapılmadı. Başlatıcıya ayrı süreç grubu, kalıcı başlangıç tanı günlüğü, port ön kontrolü ve başarısız alt süreçte hata çıkış kodu eklendi. Kullanıcı hesabı ve parolası korunuyor.


Düzeltme doğrulaması: typecheck ve build geçti. Var olan küme pg_ctl fast stop ile kontrollü kapatıldı, yeni detached başlangıç yolu ile yeniden açıldı. 55440/3001/5173 servisleri hazır; aynı yerel hesap/parola ile login, DB health, panel raporu ve arayüz 200 kontrol edildi. Uygulama lokal olarak açık bırakıldı.


## 15 Ekim 2026 — Supabase bağlantı hazırlığı
Kullanıcı kendi Supabase projesinin PostgreSQL bağlantısını sağladı. Özel karakterli parola URL-encode edilerek yalnız gitignored .env içindeki SUPABASE_DATABASE_URL alanına kaydedildi; secret API key kullanılmadı, aktif DATABASE_URL yerel bırakıldı. DNS çözülüyor ve projenin herkese açık HTTPS JWKS adresi 200 dönüyor; session pooler 5432 ve transaction pooler 6543 TCP bağlantıları timeout, Prisma P1001. Parola doğruluğu henüz doğrulanamadı. Uzak migration/veri aktarımı yapılmadı.
Yerel PostgreSQL kapalı bulundu, mevcut küme normal başlatıldı. Yerel health 200 ve tutarlı özel yedek .local/backups altında doğrulandı: 1 yönetici, henüz müşteri/tarla/iş kaydı yok. supabase:check / supabase:backup / supabase:transfer komutları eklendi; transfer hedefte ayrı saha şeması, erişim kısıtı/RLS, farklı hedefi reddetme ve satır hash doğrulaması içeriyor fakat uzak yazma yolu ağ engeli nedeniyle test edilmedi. Aktif oturumlar aktarılmaz. Yerel başlatıcı artık ilgisiz .env ayarlarını silmez; bu durum test edildi. Build ve 17 test geçti.
Aktif takip: Kullanıcının normal PowerShell oturumunda Test-NetConnection ile pooler port erişimini karşılaştır; Supabase Connect adresini ve proje/network restrictions durumunu doğrula. Erişim sağlanınca önce supabase:check, ardından supabase:transfer ve doğrulama. Otomatik bulut bağlantısı aktivasyonu henüz yapılmadı; yerel çalışan uygulama korunuyor. Paylaşılan kimlik bilgilerinin kaynak koda veya loglara yazılmaması sürdürülecek.


## 15 Ekim 2026 — Supabase SQL Editor dosyası
Kullanıcı sorguları kendisinin çalıştıracağını belirtti. supabase/kurulum.sql üretildi; Prisma migration dosyalarının SHA256 checksum'ları ve geçmişiyle uyumlu, tekrar çalıştırılabilir ve tek transaction içindedir. saha şemasında 13 uygulama tablosu + _prisma_migrations oluşturur; anon/authenticated/service_role erişimini sınırlar ve RLS etkinleştirir. Kullanıcı/parola/işletme verisi içermez. İzole PostgreSQL üzerinde iki kez uygulama, satırın korunması, 14 tablo/RLS/ACL ve Prisma migrate status doğrulandı; ayrıca mevcut PostgreSQL API E2E geçti. Supabase üzerinde tablolar henüz oluşturulmuş kabul edilmiyor: TCP hâlâ P1001, tarayıcı hesap girişi istedi; kullanıcı SQL Editor üzerinden kendisi çalıştıracak. Sonrasında tablo sonucu ve uygulama bağlantısı/veri aktarımı ayrı doğrulanacak.


## 15 Ekim 2026 — Arsa ve Parsel Sorgulama modülü
Yönetici menüsü ve API rol koruması, kademeli demo il/ilçe/mahalle listeleri, tek açıkça sentetik parsel, GeoJSON/KML yükleme ve çift katmanlı Leaflet görüntüleyici eklendi. Kırmızı sınır/dolgu, otomatik kapsam, odaklama, tam ekran, mobil düzen, bilgi kartı ve hata/eksik veri durumları hazır. Lisanslı uydu XYZ proxy sözleşmesi sunucuda; sağlayıcı/anahtar yoksa bağlı değil. Gerçek parsel servisi ve ulusal idari katalog bağlı değil; uç nokta uydurulmadı. Kalıcı veri/migration değişmedi.
Kontroller: npm run build ve npm test (22/22) geçti. Yerel uygulama yeniden başlatıldı; mevcut PostgreSQL ve hesap korundu. Tarayıcıda yönetici girişi, demo seçim zinciri, ada 100/parsel 1 sonucu, eksik bilgi kartı ve kırmızı harita sınırı doğrulandı. Dar tarayıcı görünümünde tek sütun düzeni gözlendi; ekran görüntüsü docs/parsel-ekrani.png. Gerçek parsel/uydu sağlayıcı testi erişim/lisans yokluğunda bekliyor. Kurulum sözleşmesi PARCEL_MODULE.md; önceki ML smoke/pilot ve Supabase takip işleri hâlâ bekliyor.


## 15 Ekim 2026 — Tarla formu kullanım düzeni
Kullanıcının uzun form geri bildirimi üzerine tarla kaydı iki adıma ayrıldı: temel bilgiler / konum ve sınır. GeoJSON alanları isteğe bağlı açılır bölüme taşındı, kontroller büyütüldü, form genişliği sınırlandı, kaydet/geri/vazgeç aksiyonları düzenlendi. Müşteri yoksa açık yönlendirme var. Yapılandırılmamış tarla haritası için atıflı standart OSM varsayılanı ve ResizeObserver eklendi. Build ve 22 test geçti; tarayıcıda iki adım, eksik müşteri durumu, harita atfı ve 390 px yatay taşma kontrolü yapıldı (scrollWidth 375, viewport 390). Veri kaydı yapılmadı.


## 15 Ekim 2026 — Harita merkezli parsel görünümü
Kullanıcının TKGM ekran referansına göre solda kompakt sorgu, sağda ekran yüksekliğine uyarlanan harita, harita üzerinde katman/odak/tam ekran araçları, açılır kaynak bilgi kartı ve dosya bölümü uygulandı. Mevcut işletme gezinmesi korundu. Uydu ve gerçek kadastro entegrasyonu hâlâ yetki/lisans bekliyor. Build ve 22 test geçti. Tarayıcı demo sorgusu, 1440 px masaüstü düzeni ve 390 px taşma kontrolü geçti; ekran docs/parsel-genis-harita.png. Sayfa güncellendi; veri kaydı/migration yok.


## 15 Ekim 2026 — Manuel koordinat alanları kaldırıldı
Kullanıcı talebiyle tarla formundaki enlem/boylam girişleri kaldırıldı. Konum haritadan veya sınır geometrisinden alınır; mevcut kayıt koordinatları korunur.


## 15 Ekim 2026 — Alan girişlerinin kaldırılması
Tarla formundan Alan (dekar) ve Alan bilgisi kaynağı kaldırıldı. API ve fields.area/areaOrigin null kabul ediyor; migration mevcut değerleri silmez. Supabase kurulum SQL dosyası 3 migration ile güncellendi. Build ve 22 test geçti; yerel migration uygulandı ve uygulama yeniden başlatıldı.


## 15 Ekim 2026 — Ürün kutusu kaldırıldı
Tarla formundaki Ürün girişi kullanıcı talebiyle kaldırıldı. fields.crop nullable migration uygulanarak mevcut ürünler korundu, eksik ürün null kabul edildi. Supabase kurulum SQL güncellendi.


## 15 Ekim 2026 — Gerçek parsel sağlayıcı adaptörü
TKGM cbsapi v3.1 il listesi HTTP 200 ve Konya id/text doğrulandı, eski cbsservis v3 HTTP 500. Sunucu adaptörü, canlı katalog/ada-parsel akışı, mod değişimi, yetki referansı koşulu, süre/yanıt boyutu sınırları ve hata davranışı hazır. Build ve 23 test geçti. Gerçek kullanım yetkisi doğrulanmadığından DEMO varsayılanı korunuyor. İlçe/mahalle/parsel canlı uçtan uca doğrulaması ve veri kullanım koşulları bekliyor; özellik gerçek veriyle tamamlandı sayılmıyor.


## 15 Ekim 2026 — Tarla adres dropdownları
Tarla formundaki il/ilçe/mahalle metin girişleri FieldAddress bileşeninde kademeli API seçimlerine dönüştürüldü. Yeni tarla boş seçimle başlar; üst seçim değişince alt seçim temizlenir. Yüklenme/hata/tekrar dene ve mevcut kayıt adlarını koruma davranışı var. DEMO katalog kapsamı açık gösterilir; gerçek sağlayıcı yetki ayarı henüz etkin değil.


## 15 Ekim 2026 — Türkiye genelinde adres seçimi
TürkiyeAPI 2025 veri seti MIT lisansı korunarak data/administrative altına eklendi. 81 il, 973 ilçe, 32254 mahalle ve 18183 köy yerel API'den kademeli sunulur. Tarla ve parsel ekranları aynı listeleri kullanır. TKGM kimlikleriyle karışmaması için önekli kimlikler vardır; gerçek parsel bağlantısı kapalıyken sorgu 503 döner, sahte sınır verilmez. Build ve 24 test geçti; 81 ilin ilçe kapsamı ve Konya/Seydişehir/Kızılcalar zinciri kontrol edildi.


## 15 Ekim 2026 — Tek adım tarla/parsel formu
İkinci Konum ve sınır adımı, elle nokta/sınır çizimi ve teknik dosya alanları tarla formundan kaldırıldı. Tek formun altında salt okunur harita ve Parseli Göster düğmesi var. Adres/ada/parsel değişince eski sınır temizlenir, geç gelen sorgu sonuçları uygulanmaz. query-address sunucu rotası adları sağlayıcının kendi hiyerarşisinde eşleştirir; gerçek servis kapalıyken açık 503 döner, sahte geometri üretmez. Polygon sonucu tarla sınırına aktarılır; desteklenmeyen çok parçalı kayıt açık hata verir. 25 test geçti; canlı gerçek parsel entegrasyonu yetki/servis doğrulaması bekliyor.


## 15 Ekim 2026 — Çat 121/1 canlı teknik doğrulama
Kullanıcının belirttiği Konya/Seydişehir/Çat 121/1 tekil salt okunur sorgusu gerçekleştirildi. TKGM il=64, ilçe=656, mahalle=150800, Feature/Polygon ve 10 koordinat döndürdü. Ada/parsel eşleşmesi ve uygulamanın geometri/tarla sınır doğrulaması geçti. scripts/check-parcel.ts tekrar edilebilir kontrol; gerçek geometri yalnız gitignored .local/verification/cat-121-1.json içinde tutulur, seed/araştırma verisi değildir. Sağlayıcıya yanıt kimliği kontrolü eklendi. Teknik erişim kanıtlandı; ticari/veri kullanım yetkisi kanıtlanmadığından ilk kullanıcı gereksinimi gereği genel canlı mod açılmadı.


## 15 Ekim 2026 — Kullanıcı onaylı yerel canlı test etkin
PARCEL_PROVIDER=TKGM_LOCAL_TEST yalnız NODE_ENV=development ve loopback APP_ORIGIN ile etkinleşir. Üretimde kapanması test edildi; kullanım yetkisi referansı uydurulmadı. Kullanıcı onayı yalnız yerel teknik testtir. Arayüzde yerel test/yetki doğrulanmadı uyarısı var. Tarla formunda Konya → Seydişehir → Çat → ada121/parsel1 seçilip Parseli Göster çalıştırıldı; gerçek sınır tarayıcıda görüldü. İşletme tarla kaydı oluşturulmadı. Build ve 26 test geçti; gerçek üretim kullanım koşulları hâlâ bekliyor.


Ayrı parsel ekranında kalan sabit DEMO istek modu gerçek status moduna bağlandı. Tarla formu canlı sınır doğrulamasının yanında bu ekran da kontrol ediliyor. Harita altlığı açıklaması güncellendi; elle çizim sunulmaz.


## 15 Ekim 2026 — HGM Atlas altlık entegrasyonu
Kullanıcının belirttiği resmî Haritalar API dokümanı ve atlas.js v1.0.0 incelendi. Anahtar gereklidir; kullanıcı henüz anahtarı olmadığını bildirdi. MAP_PROVIDER=HGM_ATLAS seçildi; server-only anahtar/proxy, temel ve iki katmanlı ortofoto, ortak /api/maps/config ve tarla/parsel harita bağlantısı hazır. Anahtar yokken açık mesaj ve kaynak atıflı OSM fallback vardır; Atlas görüntüsü varmış gibi gösterilmez. Build ve 27 test geçti. Canlı Atlas testi/anahtar ve erişim koşulları bekliyor. HGM_ATLAS.md kurulum sözleşmesini içerir.


## 15 Ekim 2026 — MapTiler uydu
Kullanıcı kendisine ait anahtar sağladı; yalnız gitignored .env içine kaydedildi, loglanmadı. satellite-v4 metadata 404, resmî dokümandaki satellite-v2 TileJSON 200 doğrulandı. Sabit upstream/sunucu proxy, 10 sn ve 2 MB sınırı, görüntü doğrulaması ve no-store ile uydu desteği eklendi. MapTiler/Osm atfı görünür, uydu varsayılan seçilir. HGM ayarı yerine MAP_PROVIDER=MAPTILER etkin. Ticari plan/kota koşulları işletme kullanımında ayrıca takip edilir.


MapTiler kontrolleri: build ve 28 test geçti. API anahtarı config yanıtında bulunmuyor, uydu varsayılan ve döşeme proxy/xyz sınırı test edildi. Uygulama güncel ayarla yeniden başlatıldı.


Mobil doğrulamada flex düzenindeki sıfır harita genişliği düzeltildi: map-stage/search-panel yüzde100 genişlik ve stretch. Son build geçti; uydu/parsel tarayıcı doğrulaması sürdürülür.


Son UI doğrulaması: Çat 121/1 canlı sınırı MapTiler gerçek uydu görüntüsü üstünde kırmızı gösterildi. Standart/uydu geçişi ve tam ekran kontrol edildi. Ekran kanıtı yalnız gitignored .local/verification/cat-121-1-uydu.png altında. Anahtar hiçbir kaynak dosyaya veya rapora yazılmadı.


## 15 Ekim 2026 — İlk Git teslimi
Git deposu main dalıyla başlatıldı, origin https://github.com/AtaCode03/SAHA.git olarak ayarlandı. İlk indeks 70 dosya; .env, .local, node_modules, derleme çıktıları ve research/private hariç. İndeksteki dosyalar gerçek .env sırlarıyla karşılaştırıldı; eşleşme yok. Son build geçti; ilk commit öncesi 28 test tekrar doğrulandı. Farklı ada/parselde bulunamadı geri bildirimi için kullanıcıdan başarısız örnek bekleniyor; yalnız Çat 121/1 canlı sonucu doğrulanmış durumda.

