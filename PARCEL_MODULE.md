# Arsa ve parsel sorgulama

Yönetici menüsündeki **Arsa / parsel sorgu** ekranı kullanılır. Operatör API erişimi de reddedilir. Bu modül veritabanını değiştirmez; yüklenen dosyalar kalıcı kaydedilmez.

## Çalışan akış

İl → ilçe → mahalle seçimleri API'den kademeli yüklenir. Mevcut katalog Türkiye'nin tamamı değildir; açıkça etiketli küçük bir demo kataloğudur. Konya / Seydişehir / Örnek Mahalle, ada **100**, parsel **1** tek sentetik örnektir. Diğer seçimlerde demo bulunamadı mesajı verilir; gerçek taşınmaz hakkında sonuç çıkarılmaz.

GeoJSON veya KML yüklenebilir. Örnekler `public/samples` altındadır ve ekrandan indirilebilir. WGS84 [boylam, enlem] Polygon/MultiPolygon gerekir; açık, kesişen ve aralık dışı geometriler reddedilir. Dosya en fazla 1 MB, 20 feature, 30 polygon parçası, halka başına 500 ve toplam 2000 koordinat olabilir. KML dış bağlantıları/DTD kabul edilmez. İstemci ve sunucu geometriyi doğrular; mülkiyet veya resmî kadastro doğrulaması yapılmaz.

GeoJSON'da tek feature properties içindeki `province`, `district`, `neighborhood`, `block`, `parcel`, `nature`, pozitif sayısal `areaSquareMeters`, ISO zaman damgası `updatedAt` bilgi kartında gösterilebilir. Diğer özellikler alınmaz. KML yalnız geometri taşır. Kaynak dosyası adı gösterilir; eksik bilgiler hesaplanmaz/tahmin edilmez. Karttaki yüzölçümü m² birimindedir. Dosya içeriğinin resmî doğruluğu garanti edilmez.

Harita kırmızı sınır/dolgu, otomatik kapsam, yakınlaştırma, odaklama ve tam ekran sunar. Standart harita OpenStreetMap'tir; kaynak atfı görünür. Ağ/servis hataları açık gösterilir; sorgu başarısızken başarı sonucu üretilmez.

## Gerçek veri için gerekenler

Gerçek parsel sorgusu bağlı değildir; `mode: REAL` API isteği 503 döner. Onaylı resmî veya lisanslı sağlayıcının sözleşmesi, erişim yetkisi, belgelenmiş adresleri/kimlik doğrulaması, Türkiye idari katalog kodları, geometri/koordinat sistemi ve güncelleme bilgisi gerekir. Bu bilgiler doğrulanınca sunucu adaptörü eklenmelidir. Tarayıcıdaki TKGM hizmetine erişim, uygulama API kullanım yetkisi sayılmaz. Tersine mühendislikle bulunan uç noktalar kullanılmadı.

TKGM'nin [Parsel Sorgulama hizmeti](https://www.tkgm.gov.tr/e-hizmetler/sik-kullanilanlar/parsel-sorgulama) ve [servis protokolü](https://www.tkgm.gov.tr/sites/default/files/2020-10/17_eki.pdf) incelendi. Bu projeye verilmiş erişim yetkisi doğrulanmadı.

Uydu görüntüsü parsel sınırı sağlamaz. Uydu katmanı için ticari kullanıma izin veren HTTPS XYZ servis URL'si, gerekli anahtar/hesap, atıf ve lisans referansı temin edilmelidir. `.env.example` içindeki üç `PARCEL_SATELLITE_*` alanı birlikte ayarlanır. Örnek uç nokta uydurulmadı. URL ve anahtar sunucuda kalır; yönetici oturumu isteyen yerel proxy görüntüyü aktarır. Başlıkla kimlik doğrulama veya farklı döşeme standardı isteyen servis için ayrıca adaptör gerekir. Sağlayıcı koşulları doğrulanmadan ayarlar doldurulmamalıdır.

Standart döşemeler [OSM kullanım politikasına](https://operations.osmfoundation.org/policies/tiles/) tabidir; toplu/çevrimdışı indirme yapılmaz. Yüksek trafik için uygun lisanslı harita hizmeti seçilmelidir.

## Kontroller

`npm run build` ve `npm test`: derleme, demo hiyerarşisi, bulunamadı/yapılandırılmadı, giriş/rol sınırı, GeoJSON/KML doğrulaması ve metadata sınırlaması. Lisanslı gerçek parsel veya uydu servisi olmadığı için bunların canlı entegrasyonu sınanamaz.

## TKGM adaptörü — 15 Ekim 2026
server/parcel-provider.ts sunucu adaptörü eklendi. İncelenen depolardaki eski cbsservis v3 adresi il listesinde HTTP 500, cbsapi v3.1 adresi HTTP 200 JSON döndürdü; properties.id/text alanları ve Konya id=64 doğrulandı. İlçe/mahalle/parsel yolları depo sözleşmesine göre uygulandı; bunların canlı uçtan uca sonucu ve kullanım yetkisi henüz doğrulanmadı. Bu nedenle varsayılan DEMO korunur.
Yetkili ortam için PARCEL_PROVIDER=TKGM ve PARCEL_USAGE_AUTHORIZATION_REFERENCE gerçek izin/protokol referansıyla ayarlanır. Bu alan izin oluşturmaz; edinilmiş kullanım hakkını belgelemek içindir. Adaptör sabit HTTPS host kullanır, kullanıcı URL kabul etmez, 12 sn timeout, yönlendirme reddi ve 4 MB yanıt sınırı uygular. İdari seçim zinciri sunucuda denetlenir; geometri doğrulanmadan gösterilmez. Sunucu alan/nitelik/güncelleme alanlarını doğrulanmış eşleme olmadığı için null döndürür. Arayüz veri modunu status yanıtından alır; gerçek servis hatasında demo geometriye düşmez. Testler mock yanıtla dönüşüm/yetki ayarı/hata kontrolünü kapsar; gerçek parsel başarı kanıtı değildir.


## Ulusal adres kataloğu
Demo iki il listesi yerine TürkiyeAPI 2025 yerel kataloğu kullanılır: 81 il, 973 ilçe, mahalle ve köyler. Kaynak/lisans: data/administrative/README.md ve LICENSE. Bu adres kataloğu TKGM sorgu kimlikleri veya sınır geometrisi değildir. Gerçek servis etkinleştirilince o servisin kendi idari kataloğu kullanılır. Bağımsız katalogda eksik/güncel olmayan kayıtlar bulunabilir; eksik kayıtlar uydurulmaz. Varsayılan status modu CATALOG, gerçek sınır bağlantısı kapalıdır.


## Yalnız yerel geliştirme testi
Kullanıcının açık onayıyla .env PARCEL_PROVIDER=TKGM_LOCAL_TEST ayarlandı. NODE_ENV=development ve APP_ORIGIN http localhost/127.0.0.1/::1 gereklidir. Bu mod resmî kullanım yetkisi sayılmaz ve üretimde çalışmaz. Normal üretim sağlayıcısı için TKGM ve gerçek kullanım yetkisi referansı gerekir. Yerel canlı testte servis kendi il/ilçe/mahalle kimlikleri kullanılır. Çat 121/1 gerçek sorgusu UI üzerinden doğrulandı. Uydu lisansı ayrı gereksinim; standart OSM altlığı kullanılır.

