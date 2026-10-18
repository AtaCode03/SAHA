# Google Maps'e duraklı güzergâh aktarma planı

18 Ekim 2026 — Uygulandı. Gerçek telefonda/Google Maps uygulamasında açılış ve durak teyidi bekliyor.

## Akış

1. Mevcut günlük yakınlık listesi oluşturulur; Seydişehir merkezden yakından uzağa sırası korunur. Bu sıralama yol optimizasyonu değildir.
2. Kullanıcı durakları ve sırayı gözden geçirir; ileride yukarı/aşağı düzenleme eklenebilir.
3. Google Maps'te aç düğmesi önce aktarılacak durakları gösterir. Yalnız başlangıç ve tarla temsil noktaları gönderilir; müşteri adı, telefon, not, ada-parsel veya finans bilgisi URL'ye yazılmaz.
4. Kullanıcı düğmeye basınca Google Maps URL'si açılır. Uygulama sayfa yüklenirken Google'a otomatik konum göndermez.
5. Başlangıç şimdilik yaklaşık Seydişehir merkez (37.419,31.849). Gelecekte cihaz konumu yalnız kullanıcı izniyle kullanılabilir; bu plan canlı konum entegrasyonu yapmaz.
6. Son tarla destination; önceki tarlalar waypoints olarak aynı sırada aktarılır. Dönüş istenirse ayrı seçenek olur; kendiliğinden merkeze dönüş eklenmez.

## Teknik sözleşme

- İlk seçenek Maps URLs: https://www.google.com/maps/dir/?api=1 ; Google API anahtarı gerektirmez.
- origin/destination/waypoints ve travelmode=driving; URLSearchParams ile kodlama. GeoJSON [boylam,enlem] → Maps URL enlem,boylam dönüşümü test edilir.
- Resmî belgede mobil tarayıcı için en çok 3 ara durak, diğer desteklenen ortamlarda en çok 9 ara durak belirtilir. Ortamlar arasında tüm durakların desteklendiği varsayılmaz. URL uzunluğu en çok 2048 karakter.
- Güvenli ilk sürüm: mobil uyum için bir bağlantıda en çok 3 ara durak + 1 hedef. Daha uzun listeler sırayı koruyan numaralı parçalara ayrılır; sonraki parçanın başlangıcı önceki parçanın son durağıdır. Duraklar sessizce atılmaz.
- Gerekirse tek tek Sonraki tarlaya git bağlantısı yedek akış olur.
- Tarla geometrisinden alınan temsil noktası araç giriş garantisi değildir. Giriş noktası seçme zorunluluğu eklenmez. Google Maps yol bulamazsa gerçek olmayan yol çizilmez; kullanıcıya nokta gösterilir.
- Yolculuk süresi Google Maps'te hesaplanır. URL aktarımı bu süreleri uygulamaya geri sağlamaz; uygulama kuş uçuşu mesafeyi yol süresi olarak kullanmaz.
- Link oluşturmak işin yapıldığını, randevunun onaylandığını veya navigasyonun başladığını kanıtlamaz. Drone'a komut gönderilmez.

## Geliştirme ve doğrulama

1. Geçerli geometri/konum doğrulama ve saf URL/parça oluşturucu.
2. Durak önizleme, kullanıcı tıklamasıyla açma ve numaralı parça düğmeleri.
3. Tek durak, 4 hedef, 20 hedef, geçersiz koordinat, URL kodlama/uzunluk, eksik sınır ve sıra korunması testleri.
4. Mobil tarayıcı/Google Maps uygulaması ve masaüstünde durak sayılarının gerçek açılışla teyidi. Kullanıcı onayı olmadan gerçek müşteri konumlarıyla dış servis testi yapılmaz.
5. API tarafında yalnız atanmış işleri gören operatör yetkisi korunur. Toplu yönetici listesi operatöre açılmaz.

Kaynak (18 Ekim 2026 kontrolü): https://developers.google.com/maps/documentation/urls/get-started — Directions, waypoints ve URL sınırları. Uygulama sırasında güncel belge tekrar kontrol edildi.


## Uygulama durumu
- [x] Saf URL oluşturucu ve koordinat doğrulaması: src/google-maps-routes.ts.
- [x] Günlük sırada önizleme/onay, parça bağlantıları, tek tek yol tarifi, isteğe bağlı dönüş: src/GoogleMapsStops.tsx.
- [x] 1/4/20 hedef, koordinat sırası/kodlama, bölüm zinciri, eksik/geçersiz koordinat, tekrar, kişisel veri içermeyen URL ve ilk açılışta devre dışı bağlantı testleri.
- [x] Build/typecheck ve toplam 85 test geçti.
- [ ] Gerçek mobil uygulama/tarayıcı ve masaüstünde Google Maps'in tüm ara durakları kabul ettiğini kullanıcıyla teyit etme. Gerçek tarla konumları dış servise test amaçlı gönderilmedi.
Toplu liste yalnız mevcut yönetici /planning/nearby endpoint'inden gelir; yeni herkese açık rota endpoint'i eklenmedi. URL oluşturma yereldir, SDK/iframe/Google isteği eklenmedi. Güncel iş sırası korunur, sıralama düzenleme bu sürümde eklenmedi. Altı ondalıkla enlem/boylam aktarılır. Güzergâh bağlantısı oluşturmak veya açmak iş emri/randevu durumunu değiştirmez.
