# Hava API kararı — 16 Ekim 2026

## Güncel karar: Open-Meteo araştırma entegrasyonu tamamlandı
Kullanıcı onayıyla ücretsiz geliştirme/araştırma için Open-Meteo seçildi; aşağıdaki eski WeatherAPI seçimi bu kararla değişti. Ücretsiz barındırılan API ticari işletme kullanımı için değildir. Ticari geçiş uygun abonelik/lisans gerektirir. WeatherAPI adaptörü alternatif olarak korunur, etkin değildir.

Yönetici Hava tahmini ekranında kayıtlı tarla ve gün seçer. Konum kayıtlı sınır içindeki bir noktadan, sınır yoksa kayıtlı koordinattan alınır. Kullanıcı enlem/boylam girmez. Onaylanan hava sorgularında sağlayıcıya yalnız gerekli konum ve sorgu parametreleri gönderilir; müşteri adı/telefon/not gönderilmez. Düğmeye basılmadan dış sorgu yapılmaz.

Bugün ve sonraki15 gün için saatlik rüzgâr, hamle, yön, yağış, yağış olasılığı, sıcaklık ve nem gösterilir. Rüzgâr10 m, sıcaklık/nem2 m model referansıdır; drone yüksekliğinde saha ölçümü değildir. Hamle önceki saatin maksimumu, yağış önceki saatin toplamıdır. Eksikler null kalır; eksik24 saatlik gün reddedilir. issuedAt bilinmediğinden null; retrievedAt ve validAt ayrıdır. Europe/Istanbul gösterimi ve UTC saklama uygulanır.

Supabase saha.weather_forecasts tablosunda kullanıcı/tarla ilişkisi, hedef gün, istenen/grid konumu, alınma/geçerlilik zamanı, adaptör sürümü ve normalleştirilmiş snapshot saklanır. Kayıt güncellenmez;15 dakika cache ve eşzamanlı istek birleştirme vardır. API yöneticiye özel, CSRF korumalı ve istek sınırlıdır. Sabit HTTPS sağlayıcı adresi,12 saniye timeout,1 MB yanıt sınırı; konumsuz tarla/servis hatasında kayıt yoktur. RLS açık, doğrudan tarayıcı erişimi kapalıdır. Snapshot hassas konum içerdiğinden kamu araştırma paketine eklenmez.

Yapılandırma: WEATHER_PROVIDER=OPEN_METEO, WEATHER_USAGE_MODE=RESEARCH. Anahtar gerekmez; NODE_ENV=production olduğunda bu ücretsiz adaptör kapalıdır. Open-Meteo atfı ekranda yer alır. Onaylanan Seydişehir örnek konumu için20 Ekim canlı sorgusu24 saat döndürdü. Gerçek başarım veya uçuş uygunluğu iddiası yoktur.

Bekleyenler: sürümlü ekipman/işletme limitleri, saha ölçümüyle doğrulama, randevu pencereleri ve rota entegrasyonu. P1 randevu ilk tamamlanmamış aşamadır; P4 yalnız veri toplama/gösterim kısmında ilerledi.

Resmî kaynaklar: [Koşullar](https://open-meteo.com/en/terms), [Planlar](https://open-meteo.com/en/pricing), [API](https://open-meteo.com/en/docs). Ücretsiz servis600/dakika,5000/saat,10000/gün sınırlarına tabidir; ticari geçişte koşullar yeniden doğrulanmalıdır.

## Önceki değerlendirme (arşiv)

## Seçim
İlk işletme entegrasyonu için WeatherAPI.com seçildi. Karar maliyet, ticari kullanım koşulları ve gerekli saatlik değişkenlerin bulunmasına dayanır; Seydişehir'de ölçülmüş en düşük hata iddiası değildir. Saha ölçümleriyle yerel doğruluk ayrıca değerlendirilmeli.

| Aday | İşletme açısından değerlendirme |
|---|---|
| WeatherAPI.com | Free: ticari kullanıma izin, 100 bin istek/ay,3 günlük tahmin. Starter: listede7 USD/ay,7 gün. Saatlik rüzgâr/yön/hamle, yağış/olasılık, sıcaklık ve nem alanları var. Anahtar gerekli. |
| Open-Meteo | Açık model seçenekleri, açık yükseklik/birim tanımları ve geçmiş tahmin araştırması açısından güçlü. Barındırılan ücretsiz servis ticari işletme için seçilmedi; ticari abonelik gerekiyor. İleride araştırma sağlayıcısı olarak değerlendirilebilir. |
| Tomorrow.io | Ücretsiz planda500 istek/gün fakat25/saat sınırı var; çok parselin yeniden değerlendirilmesinde dikkate alınmalı. Ticari kullanım koşulları sağlayıcıyla netleştirilmeli. İlk seçenek yapılmadı. |

Kaynaklar: https://www.weatherapi.com/pricing.aspx ; https://www.weatherapi.com/docs/forecast-api/ ; https://open-meteo.com/en/pricing ; https://support.tomorrow.io/hc/en-us/articles/20273728362644-Free-API-Plan-Rate-Limits . Fiyat/planlar değişebilir; ödeme veya abonelik oluşturulmadı.

16 Ekim'den20 Ekim'e4 gün vardır: ücretsiz3 günlük pencereye güvenip20'sine uygun hava varmış gibi plan yapılmaz. İlk geliştirme/test3 günle başlayabilir;7 günlük işletme planlaması için uygun hesap planı gerekir. Daha uzak talepler kaydedilir, hava değerlendirmesi pencere açılınca yapılır. Uzun vadeli/future tahminleri saatlik yakın dönem hava ile aynı güvenilirlikte sayılmaz.

## Hazır olan
server/weather-provider.ts: sabit HTTPS forecast.json adaptörü,10 sn timeout,1 MB sınırı, yönlendirme reddi, sunucuda anahtar. Rüzgâr kph→m/s, tarih/zaman ve sayısal değer doğrulaması; eksik alanlar null kalır. Forecast retrievedAt ve validAt ayrı; issuedAt bilinmiyorsa null. Sağlayıcının döndürdüğü konum ile istenen konum ayrı. Kaynak yüksekliği doğrulanmadığından windReferenceHeightMeters=null; uçuş yüksekliği ölçümü denmez. Forecast gerçek ölçüm değildir. Yanıt uçuş/ilaçlama uygunluğu kararı üretmez.
/api/weather/status yöneticiye yalnız ayar durumunu verir; anahtarı döndürmez. Canlı saha sorgusu henüz arayüze/API'ye açılmadı: snapshot/cache ve atama yetki sınırı tamamlanmadan araştırma veya rota kararına geçici hava verisi girmeyecek.

## Bekleyen entegrasyon
1. Kullanıcı kendi WeatherAPI hesabını/anahtarını edinir (https://www.weatherapi.com/signup.aspx); anahtar gitignored .env içindeki WEATHERAPI_KEY olur. WEATHERAPI_FORECAST_DAYS=3 veya gerçek plan7 gün ise7. Kaynak koda/VITE_ değişkenine konmaz. Trial/ücretli plan otomatik seçilmez.
2. Gerçek anahtarla Seydişehir saatlik örnek sorgu; hedef gün, birimler, hamle, eksik veri ve konum farkı doğrulanır. Saha sorgusu yetkili iş/alan bağlamında tasarlanır; sağlayıcıya yalnız gerekli konum/tarih gönderilir, müşteri adı/telefon/not gönderilmez.
3. Supabase weather_forecasts migration: değişmez yanıt/snapshot, source/sourceVersion, requested/grid location, retrievedAt, issuedAt nullable, validAt ve birimler. Hava tahmini kaydı gerçek hava gözleminden ayrı. Model tahmin anındaki hava snapshot'ına referans verir.
4. Sunucu cache ve eşzamanlı istek birleştirme.20 iş için örnekleme/güncelleme ihtiyacına göre çağrı bütçesi ölçülür; tüm tarlalar aynı hava hücresi sayılmaz. Belirsiz cache coğrafi yuvarlaması uydurulmaz.
5. Sürümlü ekipman/işletme politika eşikleri sağlandıktan sonra tüm saha süresine uygulanmış aday pencereler. Eksik/eski veri ve ayarsız limitler uygun sayılmaz. Evrensel rüzgâr eşiği/ilaç/doz tavsiyesi eklenmez.
6. Randevu ekranında saatlik tablo ve güncellenme bilgisi; sonra günlük rota taslağı ile birleştirme. Önceki plandaki tek kişi varsayılan ve isteğe bağlı çoklu ekip ayrımı korunur.

Durum: anahtar yok; canlı sağlayıcı testi/snapshot/uygunluk/rota entegrasyonu bekliyor. Bu hazırlık P1 randevu tesliminin tamamlandığı veya P4 hava pencerelerinin çalıştığı anlamına gelmez.
