# SAHA — Vercel yayını

Durum: kod yapılandırması hazır; gerçek Vercel build/deploy ve dış HTTPS uçtan uca doğrulaması henüz yapılmadı. Bu belge yayımlanmış site veya çalışan bağlantı iddiası değildir.

## 1. GitHub projesini ekleyin

1. Vercel'e GitHub hesabınızla giriş yapın.
2. **Add New → Project → Import Git Repository** ile `AtaCode03/SAHA` reposunu seçin.
3. Root Directory: repo kökü (`./`). Framework: **Vite**. Node.js: **22.x**.
4. Ayarlar `vercel.json` içinden gelir: Install `npm ci --include=dev`, Build `npm run vercel:build`, Output `dist`. Sunucuyu `npm run local` ile çalıştırmayın; Start Command gerekmez.
5. Project Name seçin. Vercel'in verdiği gerçek alan adını kopyalayın; tahmin ederek domain yazmayın.

## 2. Environment Variables

Önce yalnız **Production** kapsamını seçin. Gerçek DB bilgilerini Preview ortamına otomatik taşımayın. İleride Preview için ayrı test veritabanı ve o dağıtımın origin'i gerekir.

| Anahtar | Değer |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_ORIGIN` | Gerçek yayın adresi: `https://VERCELIN-VERDIGI-ADRES` — sonunda `/` yok |
| `DATABASE_MODE` | `SUPABASE` |
| `DATABASE_URL` | Yerel `.env` içindeki mevcut Supabase bağlantısı; parola dahil gizli değeri yalnız Vercel paneline girin. `schema=saha` korunmalı. Başlangıçta `connection_limit=1&pool_timeout=20` eklenebilir. Mevcut sorgu parametresi varsa `&` kullanın. |
| `SESSION_HOURS` | `12` |
| `MAP_PROVIDER` | Mevcut MapTiler anahtarı kullanılacaksa `MAPTILER`, aksi halde `OSM` |
| `MAPTILER_API_KEY` | Yalnız MapTiler seçildiyse mevcut özel anahtar |
| `PARCEL_PROVIDER` | Yetkili bağlantı yokken `DEMO`; Türkiye adres kataloğu açılır, gerçek parsel servisi etkinleşmez |
| `WEATHER_PROVIDER` | İsteğe bağlı; mevcut araştırma Open-Meteo bağlantısı production'da bilinçli kapalıdır |
| `ORS_API_KEY` | Yol süreleri isteniyorsa mevcut anahtar |
| `ORS_USAGE_AUTHORIZATION_REFERENCE` | Varsa incelenmiş kullanım/lisans referansı |

DB parolası özel karakter içeriyorsa URL içinde encode edilmiş olmalı. Hazır çalışan yerel `DATABASE_URL` değerini kullanın; sohbetten eski parolayı kopyalamayın. Supabase Auth anahtarları bu özel oturum sistemi için gerekli değildir. Yönetici hesabı zaten `saha.users` içinde; yeniden seed/user:create çalıştırmayın.

Bu değerlerin başına `VITE_` eklemeyin. `.env` veya `.local/BURAK_GIRIS.md` yüklemeyin, repoya eklemeyin. Ortam değişkeni değişince **Redeploy** yapın. Domain değişince `APP_ORIGIN` de değişmelidir; farklı origin'den giriş CSRF/kaynak kontrolü nedeniyle reddedilir.

İlk Import ekranında domain henüz belli değilse projeyi oluşturun; ardından Project → Settings → Domains'teki gerçek adresi `APP_ORIGIN` olarak kaydedip Redeploy yapın. Eksik origin ile API'nin başlamaması beklenen güvenli davranıştır.

## 3. Veritabanı

Mevcut Supabase `saha` şeması ve kullanıcılar korunur. Build yalnız Prisma Client üretir; otomatik migration, seed, transfer veya reset çalıştırmaz. Mevcut dokuz migration daha önce uygulanmış olmalı. İleride yeni migration varsa hedef URL'yi doğruladıktan sonra ayrı olarak `npm run db:migrate` uygulanır. `migrate reset` kullanmayın.

## 4. Yayını kontrol edin

1. Deploy sonrası `https://GERCEK-ADRES/api/health` çıktısı `status: ok`, `database: connected` olmalı.
2. Gizli pencerede kullanıcı adıyla giriş yapın. Parola Git dışı yerel teslim dosyasında.
3. Müşteri/tarla/randevu listelerinin mevcut kayıtları getirdiğini doğrulayın.
4. Bugünkü randevular ve alacak listesini kontrol edin. Gerçek hesabı test için hayali tahsilatla değiştirmeyin.
5. Çıkış yapın; korunan API artık 401 vermeli. Sayfa yenileme ve doğrudan sayfa adresi arayüzü getirmeli; `/api` hataları HTML'e dönüşmemeli.
6. `DATABASE_UNAVAILABLE`: DB URL/şema/pooler erişimi; `ORIGIN`/CSRF: yayın adresi ile `APP_ORIGIN` eşitliği; `FUNCTION_INVOCATION_FAILED`: Vercel Runtime Logs kontrol edilir. Loglara parola/anahtar yapıştırmayın.

## 5. Bu yayında açık sınırlar

- Yerel `TKGM_LOCAL_TEST` production'da çalışmaz. Kayıtlı sınırlar gösterilebilir; yeni gerçek parsel sorgusu için yetkili TKGM bağlantısı gerekir. Demo veya rastgele sınır gerçek sonuç gibi sunulmaz.
- Araştırma amaçlı ücretsiz Open-Meteo adaptörü production'da kapalıdır. Yayına almak için `NODE_ENV=development` yapmayın. Hava servisini ayrı olarak uygun kullanım koşullarıyla yapılandırmak gerekir.
- Google Maps bağlantıları kullanıcı tıklayınca çalışır; ORS ve uydu görüntüsü kendi anahtar/limitlerine bağlıdır.
- Giriş deneme sınırlaması şu anda süreç belleğindedir. Vercel'de birden çok instance ve yeniden başlatmada ortak sayaç değildir. Genel erişimi büyütmeden önce paylaşılan sayaç veya platform firewall kuralı eklenmeli; mevcut sınırlama korunur.
- Kullanım amacı ve hesap limitleri için Vercel plan koşullarını kontrol edin. Tek kullanıcı olması tek başına ticari olmayan kullanım anlamına gelmez.

## Teknik düzen

`dist` CDN'den sunulur. `/api` yolları `api/index.ts` üzerinden aynı Express uygulamasına gider; `app.listen` açılmaz. İdari JSON dosyaları ve Prisma motoru function paketine dahil edilir. İstemciye DB parolası verilmez; HttpOnly/Secure oturum çerezi ve aynı origin CSRF doğrulaması korunur. API yanıtları ortak CDN önbelleğine alınmaz. TLS Vercel tarafından sonlandırılır; yalnız Vercel ortamında bir proxy katmanına güvenilir. PrismaClient istekler arasında yeniden kullanılmak üzere modül düzeyinde tutulur.

Kaynaklar: [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel dosya paketleme](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions), [Vercel proje ayarları](https://vercel.com/docs/project-configuration/vercel-json), [Prisma bağlantı yönetimi](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections).
