> Güncel karar · 18 Ekim 2026: Randevu kaydedildiği anda kararlaştırılmış tutar Kasa → Alacaklar ve müşteri hesabına dahil edilir. Bekleyen talep iptal gerekçesiyle iptal edilince alacak düşer. Programa alınan talep bağlı iş üzerinden yalnız bir kez sayılır; iş iptali alacağı kaldırır. Erteleme alacağı kaldırmaz. Tahsilat yalnız iş tamamlandıktan sonra açılır. Ödemeli iş iptali engellenir; ödeme silinmez, gerekçeli düzeltme gerekir. Eski bağımsız iş emirleri tamamlanınca alacak oluşturur. Bu karar aşağıdaki önceki “yalnız tamamlanan işler” kuralının yerini alır. Yeni tablo/migration gerekmez; mevcut randevu ve iş kayıtları esas alınır.

# SAHA — Seydişehir tarımsal drone işletme paneli

Türkçe, mobil uyumlu tek işletme uygulaması. Express/TypeScript REST API, PostgreSQL/Prisma, React/Vite/Tailwind ve Leaflet. Ekranlar sabit demo metrikleri yerine veritabanını okur. Otomatik drone, ödeme, muhasebe, resmî parsel veya hava entegrasyonu yapılandırılmamıştır. İlaç/teşhis/doz önerisi verilmez.

## Yerel kurulum

Bu bilgisayarda uygulamayı açmak için `npm run local` kullanın. Web arayüzü http://localhost:5173/ adresinde çalışır. Komut seçilmiş veritabanını korur:

- `DATABASE_MODE=SUPABASE`: Express API doğrudan Supabase PostgreSQL `saha` şemasına bağlanır. Kullanıcı, müşteri, tarla, iş emri, finans ve yeni oturumlar orada tutulur. Yerel PostgreSQL başlatılmaz. Bağlantı yoksa açık hata verir; otomatik yerel veritabanına geçmez.
- `DATABASE_MODE=LOCAL` veya boş: Windows kalıcı yerel PostgreSQL kurulumunu kullanır; veriler %USERPROFILE%/AppData/Local/SahaLocal/data altında tutulur.

16 Ekim 2026 itibarıyla bu bilgisayarda SUPABASE seçilidir. İlk yönetici aynı e-posta/parola özetiyle aktarıldı; giriş bilgileri gitignored `.local/GIRIS_BILGILERI.md` dosyasındadır. Eski yerel oturumlar taşınmaz; geçişten sonra yeniden giriş gerekir. Ctrl+C uygulamayı durdurur, uzak veritabanını kapatmaz. İnternet yayını değildir. Supabase Dashboard → Table Editor → şema `saha` seçin; uygulama kullanıcıları `saha.users` içindedir, Supabase Auth → Users ekranıyla karıştırmayın.

Supabase bağlantısı gizli `.env` içindeki DATABASE_URL alanındadır; URL schema=saha içermelidir. Bu dosyayı kaynak kontrolüne eklemeyin. Supabase aktarımından önce `npm run supabase:backup`, sonra `npm run supabase:transfer` kullanılabilir; farklı hedef veri varsa aktarım otomatik üzerine yazmaz. Yerel kaynak yedeği .local/backups altında korunur. Geçiş için DATABASE_MODE ve DATABASE_URL birlikte değiştirilmelidir; iç `scripts/local-start.ts` dosyasını doğrudan çalıştırmayın.


Node 24 LTS, npm ve Docker Compose gerekir. Sürümler package.json ve package-lock.json içinde sabittir. Node 25 bu teslim ortamında bulunmuş olsa da LTS önerilir.

```powershell
Copy-Item .env.example .env
# .env: yerel POSTGRES_PASSWORD ve DATABASE_URL değerlerini aynı parola ile düzenleyin.
npm ci
docker compose --env-file .env up -d postgres
npm run db:generate
npm run db:migrate
```

İlk yönetici ve operatör ortam değişkenleriyle oluşturulur. Gerçek parolayı komut geçmişine, kaynak dosyasına veya loga yazmayın. PowerShell'de güvenli istem:

```powershell
$env:USER_EMAIL = Read-Host 'E-posta'
$env:USER_NAME = Read-Host 'Ad'
$env:USER_ROLE = 'ADMIN' # ikinci hesap için OPERATOR
$taskSecret = Read-Host 'En az 12 karakter parola' -AsSecureString
$taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
try {
  $env:USER_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer)
  npm run user:create
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer)
  Remove-Item Env:USER_PASSWORD
}
npm run dev
```

Panel: http://localhost:5173, API: http://127.0.0.1:3001. APP_ORIGIN ziyaret edilen adresle birebir eşleşmelidir. Vite /api proxy'si kullanılır; üretimde aynı origin'den servis edilir.

## İsteğe bağlı sentetik seed

Varsayılan kurulum seed çalıştırmaz. SEED_PASSWORD ortam değişkenini yukarıdaki güvenli parola istemiyle geçici olarak ayarlayın ve `npm run db:seed` çalıştırın. `demo.operator@example.invalid` sentetik operatör oluşturulur. Müşteri/tarla/iş açıkça SYNTHETIC'tir; gerçek müşteri kaydı gibi kullanmayın. Tekrarlanan seed mevcut parolayı değiştirmez. Araştırma dışa aktarımı bu kayıtları hariç tutar. Sabit demo parolası yoktur.

## Günlük kullanım

Yönetici müşteri → tarla → ekipman/operatör → iş emri akışını izler. İş planında başlangıç/bitiş ve atama girilir; aynı drone veya operatöre çakışan plan reddedilir. Operatör yalnız atanmış işleri görür. Hazırlık başlangıcı işi başlatır; uçuş/bekleme açıkken tamamlanamaz. Dolum/batarya olayı yeni aralık başlatır; sonraki olay o aralığı kapatır. Uçuş/bekleme bittikten sonraki genel saha işi hazırlık/geçiş olarak sınıflanır. Tamamlama ayrılmaya hazır zamanını temsil eder. Yanlış olay zamanı gerekçeli olarak düzeltilir; önceki değer audit_logs'da saklanır.

Kısmi tahsilat ve bedel düzeltmesi yöneticiye aittir. Gider tek işe, eşit payla çok işe veya dağıtılmamış günlük gider olarak kaydedilir. Eşit dağıtım kuruş farkını girişteki ilk işlere ekler. İç işletme takibidir; fatura değildir.

Harita döşemesi varsayılan yapılandırılmamıştır. Sağlayıcınızın URL'sini VITE_MAP_TILE_URL ve atıf metnini VITE_MAP_ATTRIBUTION ile birlikte girin, Vite'i yeniden başlatın. Konum manuel koordinat, haritaya tıklama ve Polygon çizme/yükleme ile girilir. GeoJSON sıra [boylam,enlem]. İlk sürüm yalnız Polygon destekler. Harita sağlayıcısı kullanıcı IP'sini ve görüntülenen bölgeyi görebilir; gerçek kullanımda işletmenin sağlayıcı tercihi gerekir.

## Kontroller

```powershell
npm run typecheck
npm run build
npm test
```

Testler erişim sınırı/CSRF/durum/süre/decimal ödeme/çakışma/GeoJSON ve CSV hassas alan izin listesini sınar. İzole API testleri PostgreSQL uçtan uca testi değildir. Gerçek PostgreSQL akışı için ayrı test veritabanı oluşturun; mevcut işletme verisini resetlemeyin:

```powershell
# Ayrı boş test DB URL'sini DATABASE_URL ve TEST_DATABASE_URL olarak geçici atayın.
npm run db:migrate
npm run test:integration
```

Teslim ortamındaki güncel kontrol sonuçları ve ilk tamamlanmamış iş PROJECT_PLAN.md içinde tutulur.

Docker bulunmayan geliştirme bilgisayarlarında `npm run test:postgres` yeni rastgele adlı geçici PostgreSQL kümesi oluşturur, migration ve E2E testlerini uygular, sonra sunucuyu durdurur. Windows için binary paketinin Türkçe yol sorununu ayrı ASCII geçici kopyayla aşar. İşletme DATABASE_URL'sine dokunmaz; reset veya veri silme yapmaz. Test dosyaları geçici klasörde kalır. Taşınabilir PostgreSQL paketinin beta etiketi yalnız bu geliştirme test aracına aittir; üretim veritabanı olarak önerilmez.

## Üretim

`npm run build`; `NODE_ENV=production`, HTTPS APP_ORIGIN ve gerçek DATABASE_URL ile `npm start`. API localhost'a bağlıdır; TLS ters proxy arkasında kullanın. Güvenilir proxy yapılandırması yapılmadığı için rate limit doğrudan bağlantı IP'sine göre uygulanır; proxy altında bütün kullanıcılar aynı IP kotasını paylaşabilir. İlk sürüm tek API sürecidir, giriş sınırlaması bellektedir; yatay ölçek öncesinde ortak rate-limit store gerekir. Secure, HttpOnly, SameSite=Strict cookie ve Origin+CSRF token kontrolü vardır. Oturum logout ve tüm oturumları iptal endpoint'i ile iptal edilir. Parola bcrypt cost 12. Yedekleme/geri yükleme, TLS, erişim yetkileri ve saha pilotu üretim öncesi işletme ortamında doğrulanmalıdır. Giriş, kayıt ve form hataları başarılı gibi gösterilmez; ağ hatasında form korunur. Çevrimdışı senkronizasyon yoktur.

## Araştırma

### Supabase PostgreSQL geçişi

Supabase bağlantısı sunucuya özel `SUPABASE_DATABASE_URL` olarak `.env` içinde tutulur. Paroladaki özel karakterler URL-encode edilmelidir. `npm run supabase:check` yalnız bağlantıyı kontrol eder. `npm run supabase:backup` yerel kayıtların tutarlı yedeğini gitignored `.local/backups` altında oluşturur. Bu özel yedek kullanıcı parola hash'leri ve işletme kayıtları içerir; kamu araştırma paketi değildir.

`npm run supabase:transfer` önce yedek alır, ayrı `saha` şemasında migration uygular ve yalnız boş veya kaynakla tamamen aynı hedefe aktarır. Farklı hedef kayıtlarının üzerine yazmaz. Kullanıcı parolaları hash olarak korunur; aktif oturumlar taşınmaz. Satır/hash karşılaştırması yapılır. `saha` şeması ve tabloları Data API rollerinden ayrılır, RLS etkinleştirilir; erişim mevcut Express oturum/rol kontrolleri üzerinden yapılır. Publishable/secret API key ve JWKS, mevcut Prisma bağlantısında kullanılmaz.

Bu araç aktif `DATABASE_URL` değerini otomatik değiştirmez. Başarılı aktarım ve doğrulama sonrasında uygulamanın bulut bağlantısına geçişi ayrıca yapılır; `npm run local` DATABASE_MODE seçimine göre çalışır; SUPABASE modunda uzak bağlantıyı korur ve yerel PostgreSQL açmaz. Sunucu bağlantısında P1001/TCP timeout varsa parola doğrulanmış sayılmaz; port/ağ erişimi sağlanmadan migration veya veri geçişi yapılmaz.

Araştırma ekranı CSV + sözlük + yöntem + eksik veri + deney özeti + manifest dosyalarını indirilebilir sunar. İç işletme CSV'si ayrı ve özeldir. Paylaşılabilir paket ham konum/tarih/kimlik içermez; nadir özellik riskleri paylaşım öncesi insan incelemesi gerektirir. Kararlı rastgele araştırma kimliği eşleştirmesi veritabanında kalır. Mendeley Data'ya dosya hazırlar; yayımlama/DOI oluşturmaz.

İsteğe bağlı offline Python hattı research/CONTRACT.md içinde. Temel web uygulaması Python gerektirmez. Gerçek eğitilmiş/doğrulanmış model yok; panel yalnız baseline veya yeterli veri yok gösterir. Model başarısı ve saha pilotu beklemededir. Günlük sıra taslağı manuel ulaşım süresini kullanır; yol verisi veya rota optimizasyonu değildir.

### Windows başlatma hataları
Yerel başlatıcı PostgreSQL'i ayrı Windows süreç grubunda başlatır; Ctrl+C kapanışı pg_ctl ile yapılır. Başlatma hatası gizlenmez: .local/postgres-startup.log ayrıntısı gösterilir. 3001/5173 portları önceden doluysa anlaşılır hata döner. PostgreSQL data klasörünü veya postmaster.pid dosyasını elle silmeyin; mevcut küme normal başlatmada kendi kurtarma işlemini yapar.


### Supabase SQL Editor ile tablo kurulumu
Veritabanı TCP portuna erişilemiyorsa Supabase panelinde SQL Editor > New query açın; supabase/kurulum.sql dosyasının tamamını yapıştırıp Run seçin. Bu dosya kullanıcı, oturum, müşteri, tarla, drone, iş emri, operasyon, finans ve araştırma tablolarını saha şemasında oluşturur. Mevcut kayıtları silmez; migration geçmişi/checksum korunur, tekrar çalıştırma aynı migration'ı yeniden uygulamaz. Public şemaya işletme tablosu eklemez. Supabase Table Editor'da schema filtresinden saha seçilmelidir. Kullanıcı veya saha verisi seed edilmez; hesabın aktarımı ayrı aşamadır. Dosyayı yeniden üretmek için npm run supabase:sql; izole gerçek PostgreSQL testi için npm run test:supabase-sql.


## Arsa / parsel sorgulama
Yönetici menüsüne demo sorgusu ve GeoJSON/KML görüntüleme eklendi. Gerçek kadastro API'si bağlı değildir. Kurulum, sınırlar ve servis gereksinimleri: [PARCEL_MODULE.md](PARCEL_MODULE.md).


HGM Atlas altlık entegrasyonu ve anahtar kurulumu: [HGM_ATLAS.md](HGM_ATLAS.md). Anahtar yokken açıkça belirtilen geçici OSM altlığı kullanılır.


Uydu altlığı: MAP_PROVIDER=MAPTILER ve server-only MAPTILER_API_KEY. satellite-v2 erişimi doğrulandı. Uydu varsayılan, standart OSM alternatifidir. Anahtar istemciye/repoya gönderilmez; gelişimde kota ve ticari plan koşulları takip edilir. HGM entegrasyonu isteğe bağlı kalır.

# Hava tahmini (geliştirme/araştırma)

Rota servisi hazırlığı: OpenRouteService Matrix/Directions sunucu adaptörleri için `.env` içine `ORS_API_KEY` eklenir. Anahtar tarayıcıya verilmez. Canlı servis testi geçti; depo/giriş teyidi sonrası günlük planda API matrisi veya ayrı manuel kaynak seçilir. Güncel adımlar ROAD_WORKFLOW.md içindedir. Ayrıntılar [ROAD_API_SETUP.md](ROAD_API_SETUP.md) içindedir.
Yönetici menüsündeki **Hava tahmini** ekranında kayıtlı tarla ve tarih seçip **Tahmini getir** düğmesine basın. `.env`: `WEATHER_PROVIDER=OPEN_METEO`, `WEATHER_USAGE_MODE=RESEARCH`. API anahtarı gerekmez. Yeni tablo için `npm run db:generate` ve `npm run db:migrate`; uygulama için `npm run local`. Supabase Table Editor'da `saha.weather_forecasts` tablosunu seçin.

Ücretsiz Open-Meteo erişimi geliştirme/araştırma içindir; üretim modunda kapalıdır. Ticari kullanım uygun servis planı gerektirir. Sorgu kayıtlı tarla konumunu hava sağlayıcısına gönderir; müşteri adı/telefon/not göndermez. Tahmin24 saatlik tablo olarak gösterilir ve Supabase snapshot'ına yazılır;15 dakika önbellek kullanılır. Uçuş uygunluğu veya otomatik rota henüz üretilmez. Ayrıntılar: WEATHER_API_DECISION.md. İlk tamamlanmamış rota aşaması P1 randevudur.


## Otomatik maliyet ve fiyat — 17 Ekim 2026
Randevu planlama → Birim fiyatlar: hizmet, ilaç ve diğer maliyet kalemleri; TL/dekar, TL/litre, TL/kg veya sabit adet/iş. Kalemler fiziksel silinmez; arşivlenir. Miktarlar ve fiyatlar kullanıcı tarafından belirlenir; ilaç/doz önerisi yoktur.
Randevu ve yeni iş emrinde kalemler seçilir, litre/kg için toplam miktar girilir, maliyet üzerine kâr yüzdesi belirlenir ve hesaplama yapılır. Son fiyat = maliyet + maliyet × kâr / 100. Bu oran satış kâr marjı değildir. Vergi/fatura hesabı kapsam dışıdır.
Alan, doğrulanmış parsel geometrisinden hesaplanır ve 0,001 dekar hassasiyetinde fiyatlandırılır. Sınır yoksa hesaplama yapılmaz. Her satır ve kâr kuruşa HALF_UP yuvarlanır; Decimal kullanılır. Eksik kalemler otomatik eklenmez; kullanıcı tüm maliyetleri seçmelidir.
Supabase saha.price_items tarifeyi; appointment_requests.pricingSnapshot ve work_orders.snapshot.pricing tarihsel maliyet/fiyat dökümünü saklar. Tarife değişince eski kayıtlar değişmez. Kaydetmede sunucu alanı/tarifeyi tekrar hesaplar; sürüm veya toplam değişmişse yeniden hesaplama ister. Operatör bu finans verilerine erişemez. Tahmini maliyet gerçek gider defterine otomatik yazılmaz; çift sayılmaz. İlk gerçek işletme tarifesi kullanıcı tarafından girilecek; uydurma fiyat eklenmedi.

## Sade kullanım
Günlük akış ve sadeleştirilen ekranlar: [SADE_KULLANIM.md](SADE_KULLANIM.md). Günlük rota sonucunda Yazdır / PDF kaydet ile iş listesi alınabilir. Teknik hava/araştırma araçları yönetici için Gelişmiş araçlar altında; ekip/depo ayarları Randevu ve rota → İlk kurulum / ayarlar altında.

## Müşteri hesabı ve tahsilat (18 Ekim 2026)
- Müşteriler ve tarlalar → Müşteriler → Hesap / ödeme al: tamamlanan hizmetler, bu işlere ödenen tutar, kalan borç ve hesap hareketleri.
- Tamamlanan işte İş sonu ödeme: Tamamı ödendi, Kısmi ödeme al veya Veresiye / vade. İşin tamamlanması ödeme yapılmasına bağlı değildir; operatör finans göremez.
- Kasa → Alacaklar / Tahsilatlar / Giderler. Alacak vadesi varsa gecikme gösterilir; tahsilatlarda tarih ve müşteri filtresi vardır.
- Müşteri ödeme formu tutarı önce en eski açık tamamlanmış işlere dağıtır. Dağılım kaydetmeden önce görülür ve düzenlenebilir. Toplam uyuşmazlığı, başka müşteri/planlanan işe dağıtım ve fazla ödeme reddedilir.
- Ödeme yöntemleri: nakit, havale/EFT, diğer. Eski kayıtlar LEGACY/yöntem belirtilmemiş olarak korunur. Düzeltme gerekçeli ve sürüm kontrollüdür; 0 TL'ye düzeltme kaydı geçersizleştirir, silmez. Toplu tahsilatın ortak tarih/yöntem/not değişiklikleri dağıtım satırlarına birlikte uygulanır.
- Tahakkuk kuralı: yalnız COMPLETED işler alacak oluşturur. REQUESTED/PLANNED/RUNNING/POSTPONED/CANCELLED işler yeni alacak hesabına katılmaz. Bu, eski rapordaki planlanan bedellerin de alacağa eklenmesinden farklıdır; geçmiş bedel/ödeme kayıtları değiştirilmedi. Tamamlanmamış işlerdeki eski ödemeler müşteri kartında ayrıca belirtilir.
- Yeni migration: 20261018030000_customer_accounts. Mevcut kurulumda `npm run db:generate` ve `npm run db:migrate`; Supabase SQL paketi `npm run supabase:sql`. Reset veya seed gerekmez.
- Finans planı: CUSTOMER_ACCOUNT_PLAN.md. Google Maps'e durak aktarımı yalnız GOOGLE_MAPS_ROUTE_PLAN.md içinde planlı; henüz uygulanmadı.

## Google Maps'te duraklı güzergâh (18 Ekim 2026)
Randevular → Günlük rota: Google Maps güzergâhı bölümünde durakları kontrol edin. Konum paylaşma onayını işaretleyip Google Maps'te aç bağlantısına basın. En çok 4 hedef tek bağlantı; uzun listeler sırayı koruyan bölümlerdir. Sonraki bölüm öncekinin son noktasından başlar. İsterseniz merkeze dönüşü ekleyin. Cihaz ara durakları desteklemiyorsa Tek tek tarlaya git bağlantılarını kullanın. Başlangıç Seydişehir merkezdir; canlı konum izni istenmez. Müşteri adı/telefon/not/bedel URL'ye eklenmez. Yol ve süre Google Maps'te hesaplanır, uygulamaya geri alınmaz. Parsel temsil noktası araç giriş garantisi değildir. Kullanım Google Maps üzerinde ayrıca telefon/masaüstü teyidi gerektirir; geliştirme testleri dış servise gerçek müşteri verisi göndermeden yapıldı.
