# SAHA — Seydişehir tarımsal drone işletme paneli

Türkçe, mobil uyumlu tek işletme uygulaması. Express/TypeScript REST API, PostgreSQL/Prisma, React/Vite/Tailwind ve Leaflet. Ekranlar sabit demo metrikleri yerine veritabanını okur. Otomatik drone, ödeme, muhasebe, resmî parsel veya hava entegrasyonu yapılandırılmamıştır. İlaç/teşhis/doz önerisi verilmez.

## Yerel kurulum

Bu Windows bilgisayarında Docker olmadan oluşturulan kalıcı yerel kurulum için `npm run local` komutunu kullanın. Komut önce production build alır, yerel PostgreSQL'i 127.0.0.1:55440 üzerinde başlatır, migration uygular ve derlenmiş API + Vite preview'ı açar. Uygulama http://localhost:5173/ adresindedir. İlk yönetici bilgileri gitignored `.local/GIRIS_BILGILERI.md` dosyasındadır; parola rastgele oluşturulur ve sonraki çalıştırmalarda değiştirilmez. Saha/demo kayıtları eklenmez. DB dosyaları `%USERPROFILE%/AppData/Local/SahaLocal/data` altında kalır. Ctrl+C uygulamayı/veritabanını durdurur, kayıtları silmez. Bu yerel geliştirme kurulumudur; internet yayını veya üretim barındırması değildir. Mevcut farklı `.env` ilk kurulumda ezilmez.

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

Bu araç aktif `DATABASE_URL` değerini otomatik değiştirmez. Başarılı aktarım ve doğrulama sonrasında uygulamanın bulut bağlantısına geçişi ayrıca yapılır; `npm run local` daima yerel PostgreSQL'i açar ve Supabase aday bağlantısını korur. Sunucu bağlantısında P1001/TCP timeout varsa parola doğrulanmış sayılmaz; port/ağ erişimi sağlanmadan migration veya veri geçişi yapılmaz.

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

