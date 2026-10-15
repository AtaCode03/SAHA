# HGM Atlas harita altlığı
Resmî belge: https://api.harita.gov.tr/atlasapidoc/hari%CC%87talar
Resmî SDK: https://api.harita.gov.tr/atlas-js/v1.0.0/atlas.js (v1.0.0). SDK kaynak kodu projeye kopyalanmadı; belgelenmiş Leaflet katman adresleri kullanılır.

## Durum
MAP_PROVIDER=HGM_ATLAS seçildi. İşletmeye ait API anahtarı yok; Atlas henüz canlı değil. Arayüz bunu açıkça bildirir ve geçici OpenStreetMap gösterir. Atlas örnek anahtarı kullanılmaz. TKGM parsel geometrisi bağımsızdır ve yerel test modu korunur.

## Anahtar edinilince
HGM Atlas geliştirici platformundan size ait API erişimi ve kullanım koşulları edinilmelidir. İletişim: https://api.harita.gov.tr/atlasapidoc/bize-ulasin
Gitignored .env içine HGM_ATLAS_API_KEY ekleyin; MAP_PROVIDER=HGM_ATLAS bırakın. VITE_ değişkenine veya kaynak koda anahtar koymayın. Yerel uygulamayı kapatıp npm run local ile yeniden başlatın.
Sunucu proxy kullanımı, sunucu IP/domain kısıtları ve döşeme erişiminin sözleşmeyle uyumlu olduğu sağlayıcıdan doğrulanmalıdır. Anahtarın alınmış olması her kullanım şekline izin verildiği anlamına gelmez.

## Teknik akış
/api/maps/config oturum gerektirir; anahtar veya upstream URL içermez. /api/maps/hgm/:layer/:z/:x/:y oturumla görüntü aktarır; yalnız temel/ortofoto/etiket seçimi, tam sayı xyz, 10 sn timeout, 2 MB sınır, görüntü content-type ve yönlendirme reddi vardır. Kullanıcı upstream URL gönderemez. Hatalarda anahtar/URL loglanmaz. Döşemeler private no-store ile iletilir; toplu indirme veya kalıcı cache yoktur.
Temel: harita/hgm_harita PNG. Hava fotoğrafı: ortofoto JPG + harita/hgm_ortofoto PNG etiket katmanı. Bu yollar resmî SDK'da görüldü; işletme anahtarıyla canlı erişim test edilmedi. Atıf HGM Atlas olarak görünür. Anahtar yoksa açık OSM fallback ve OSM atfı vardır. İstek başarısızlığında sınır geometrisi korunur ve harita hatası gösterilir.

## Kontroller
Build ve 27 test geçti; Atlas config/fallback, anahtarın config içinde olmaması, proxy dönüşü, iki ortofoto katmanı ve geçersiz xyz test edildi (mock). Gerçek Atlas temel/ortofoto görüntüsü anahtar yokluğu nedeniyle bekliyor.
