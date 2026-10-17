# OpenRouteService bağlantısı —17 Ekim2026

## Güncel durum: günlük plana bağlandı
Depo/giriş teyidi, ORS yol adayı, Supabase travel_matrices snapshot/cache, kaynaklı plan girdisi ve TravelRoute LineString kaydı uygulandı. Randevu planlama ekranından kullanılabilir. Kullanım için ROAD_WORKFLOW.md; güncel test/çalışma durumu için PLANNING_HANDOFF.md esas alınır. Aşağıdaki ilk adaptör tesliminin “bağlanmadı/anahtar yok” ifadeleri artık geçmiş durumdur. Kullanıcıdan sayısal koordinat istenmez. Konumlar ORS'ye yalnız arayüzdeki açık aktarım onayıyla gönderilir.

## İlk adaptör teslimi ve sözleşmesi (arşiv)

## Canlı bağlantı doğrulaması
Kullanıcı ORS_API_KEY anahtarını yerel .env dosyasına ekledi.17 Ekim'de resmî Matrix belgesindeki kamuya açık örnek noktalarla Matrix ve Directions başarılı çalıştı: yönlü süreler farklı döndü ve62 koordinatlı LineString alındı. Directions için Accept: application/geo+json kullanıldı; application/json başlığının406 döndürdüğü canlı testte yakalanıp düzeltildi. Anahtar değeri veya işletme konumları paylaşılmadı. Özel test özeti .local/verification/ors-live.json içindedir. Bu doğrulama Türkiye tarla yolu/giriş doğruluğunu veya hesap planının ticari kullanım uygunluğunu kanıtlamaz. Aşağıdaki “anahtar henüz sağlanmadı” eski durumdur; depo/giriş teyidi ve günlük plana bağlama halen bekler.

## Bu teslimin kapsamı

Sunucuda Matrix (yönlü süre/mesafe) ve Directions (gerçek yol LineString) adaptörleri ve yönetici REST uçları hazırlandı. Planlama ekranında bağlantı durumu gösterilir. Hesap anahtarı henüz sağlanmadı; canlı erişim, kullanım planı ve yerel yol doğruluğu doğrulanmış değildir. Günlük plan hâlâ açıkça manuel yol dakikalarını kullanır. API eklenmiş olması haritadaki parsel merkezlerini doğrulanmış tarla girişlerine dönüştürmez.

## Hesap ve yapılandırma

1. [HeiGIT hesabı](https://account.heigit.org/) üzerinden kullanıcı kendi hesabını ve API anahtarını oluşturur. Hesap planı/kota ve gerçek işletme kullanımına uygun koşullar kullanıcı tarafından incelenmelidir. Ücretli abonelik veya sözleşme kullanıcı adına oluşturulmaz.
2. Git dışında kalan `.env` içine `ORS_API_KEY=...` eklenir. Anahtar sohbete, kaynak koda veya `VITE_` değişkenine yazılmaz.
3. İsteğe bağlı `ORS_USAGE_AUTHORIZATION_REFERENCE` içine incelenen hesap planı/koşulları ve inceleme tarihi kaydedilir. Gerçekte yapılmamış doğrulama yazılmaz. Bu alan isteğe bağlı işletme belgesidir; ağ çağrısı için gereken ayar ORS_API_KEY anahtarıdır.
4. `npm run local` uygulamayı derleyip seçili Supabase moduyla çalıştırır. Anahtar değişince sunucu yeniden başlatılır. Randevu planlama → Gün planı ekranında bağlantı ayarları kontrol edilir; “yapılandırılmış” yalnız yerel ayarların varlığını ifade eder, canlı servis başarısı değildir.

## REST sözleşmesi

Tüm uçlar mevcut HttpOnly oturum + yönetici rolü; yazmalarda Origin/CSRF ister.

- GET `/api/roads/status`: anahtar veya kullanım kaydı metnini göstermeden yapılandırma durumunu verir.
- POST `/api/roads/matrix`: teyitli2–25 nokta için yönlü süre/mesafe döndürür.
- POST `/api/roads/directions`: teyitli2–25 noktanın verilen sıradaki karayolu çizgisini döndürür; sıra optimizasyonu yapmaz.

POST gövdesi: `points: [{id, longitude, latitude, accessConfirmed:true}, ...]`, `transmitConsent:true`. Koordinatlar WGS84; sağlayıcıya `[boylam,enlem]` gönderilir. UI'de kullanıcıya enlem/boylam yazdırılmayacak; depo ve erişim noktaları harita/servis adayı üzerinden teyit edilecek. Bu harita teyit akışı henüz tamamlanmadığından hesaplama düğmeleri günlük plana bağlanmış değildir. Teyit/onay alanları eksikse sunucu422 döndürür. Bu booleans fiziksel girişin doğruluğunu otomatik kanıtlamaz; yönetici teyidini temsil eder.

Sunucu yalnız koordinatları ve araç profili/hesap parametrelerini sabit HTTPS sağlayıcı adresine gönderir; müşteri adı, telefon, not veya nokta kimlikleri gönderilmez. Anahtar Authorization başlığındadır. Gövde veya sağlayıcı hatası loglara/istemciye ham olarak yansıtılmaz. Harici konum aktarımı için kullanıcıya kapsam açıklanmalı ve onayı alınmalıdır; şu ana kadar canlı ORS sorgusunda konum gönderilmedi.

Matrix `durationSeconds`, yukarı yuvarlanmış `minutes`, `meters`, `reachable` verir. Erişilemeyen/eksik bağlantılar null; sıfır süre uydurulmaz. A→B ve B→A ayrı tutulur. Kaynak, alınma zamanı, sürüm ve varsa yol grafiği tarihi döner. Araç profili driving-car; canlı trafik veya ağır araç uygunluğu garantisi değildir. Directions harita sağlayıcısından alınan yol çizgisidir, noktaları birleştiren yapay çizgi değildir. Kaynak atfı sonuçla birlikte verilir.

15 saniye timeout,2 MB yanıt sınırı, yönlendirme reddi, yönetici başına20 istek/15 dakika, aynı Matrix sorgularında birleştirme ve15 dakika/en çok20 kayıtlık süreç içi önbellek vardır. Sonuçlar henüz kalıcı seyahat matrisi tablosuna veya araştırma paketine yazılmaz. API hatası sahte başarı üretmez; kota ve erişim sorunları ayrı hata kodlarıdır.

## Sonraki entegrasyon

Hesap/koşullar ve kullanıcı konum aktarımı onayından sonra: depo konumu, otomatik yol giriş adayı ve haritada teyit; nokta sürümleri; kalıcı travel_matrices snapshot/cache; günlük plana kaynaklı legs aktarımı; onayda noktaların değişmediğinin kontrolü; seçilen sıra için Directions çizgisinin Leaflet'te gösterimi. Manuel düzeltmeler gerekçeli ve ayrı kaynaklı olmalı. Tarla yolları/erişilemeyen konumlar gerçek örneklerle test edilmelidir. Bu işler henüz tamamlandı diye gösterilmez.

## Doğrulanan resmî kaynaklar

- [Matrix ve saniye birimi](https://giscience.github.io/openrouteservice/api-reference/endpoints/matrix/)
- [Directions](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/)
- [API anahtarının sunucuda tutulması](https://giscience.github.io/openrouteservice/frequently-asked-questions)
- [Servis kısıtları](https://openrouteservice.org/restrictions/)
- [Hesap planları](https://account.heigit.org/info/plans)
- [Hesap koşulları](https://account.heigit.org/info/tos)
