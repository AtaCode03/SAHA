# Veri sözlüğü ve toplama protokolü v1.0

## İlişkiler ve yaşam döngüsü

users → sessions (kullanıcı silinirse oturum cascade); users → atanmış work_orders/operation_events/audit_logs restrict. Kullanıcılar devre dışı bırakılır, tarihsel operatör silinmez. customers → fields/work_orders restrict; müşteriyi sil API'si fiziksel silmez, arşivler. fields ve drones aktiflik ile arşivlenir. work_orders → events/payments/expenses/predictions restrict; terminal iş değiştirilmez, olay düzeltmesi audit ile yapılır. Kimlikler UUID, araştırma kimlikleri ayrı rastgele UUID'dir. Tek işletme; tenant/çok işletme alanı yok.

## Alanlar ve birimler

| Varlık               | Başlıca alanlar                                                   | Birim / anlam                                                                                                   |
| -------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| customers            | name, phone, neighborhood, notes, active, source                  | Kişisel işletme bilgisi; dışa araştırma paketine çıkmaz                                                         |
| fields               | customerId, name, province, district, neighborhood, block, parcel | Konum metadatası; ada-parsel tek başına konum değildir                                                          |
| fields               | area, areaOrigin, crop                                            | decimal(12,3) dekar; 1 dekar=1000 m²; MEASURED / OPERATOR_ESTIMATE / EXTERNAL                                   |
| fields               | latitude, longitude, boundary                                     | WGS84 derece; GeoJSON Polygon [boylam,enlem], kapalı halka, kesişme yok                                         |
| drones               | model, tankLiters, active                                         | Tank decimal litre; bilinmiyorsa null                                                                           |
| work_orders          | requestedAt, plannedStart/End, sequence, operatorId, droneId      | Europe/Istanbul gösterim; DB timestamptz; bitiş hariç yarı açık takvim aralığı                                  |
| work_orders          | plannedArea, service, agreedPrice, adjustment, snapshot, status   | Planlanan alan dekar, bedel decimal(14,2) TL; snapshot değişmeyen iş öncesi özellikler                          |
| operation_events     | kind, at, origin, idempotencyKey, payloadHash                     | Artan olay zamanı; ölçülmüş / operatör tahmini / dış kaynak; aynı anahtar aynı payload için yeniden sonuç döner |
| expenses             | kind, amount, at, orderId, allocationGroup/Rule                   | TL decimal; DIRECT/EQUAL/UNALLOCATED; ulaşım süreleri saha süresinden ayrı                                      |
| payments             | amount, at, orderId, idempotencyKey                               | TL decimal; kısmi, kalan bakiyeyi aşamaz                                                                        |
| audit_logs           | userId, entity, entityId, action, before, after, reason, at       | Durum, olay düzeltmesi, plan, ödeme/bedel değişikliği geçmişi                                                   |
| prediction_snapshots | input, method, version, minutes, at                               | İş başlamadan baseline veya INSUFFICIENT_DATA; null eksikliği sıfır değildir                                    |
| model_versions       | version, metadata, validated                                      | Gelecekte doğrulanan offline model kaydı; ilk sürümde ML etkin değil                                            |
| research_exports     | version, count, manifest, at                                      | Yönetici paket hazırlama kaydı; yayın kaydı/DOI değildir                                                        |

## Operasyon aralıkları

PREPARATION ilk olaydır. FLIGHT_START → FLIGHT_END ve WAIT_START → WAIT_END çiftleri zorunludur. REFILL/BATTERY sonraki olayda kapanan dolum/batarya aralığını başlatır. Hazırlık, uçuş, dolum, batarya ve bekleme birbirini dışlayan aralıklardır. Genel geçiş/kurulum hazırlığa dahildir. COMPLETE son olay; açık uçuş/bekleme varsa reddedilir. Toplam saha süresi hazırlık başlangıcı–tamamlama dakika farkıdır; bekleme dahil, ulaşım hariç. Açık operasyonun nihai hedefi null; sıfır atama yok. Gelecek, tekrarlı, ters zaman ve geçersiz diziler reddedilir. Düzeltme bütün diziyi tekrar doğrular; before/after/kullanıcı/gerekçe saklanır. Otomatik telemetri yok. Gerçek uçuş dosyası öğrenildiğinde source=EXTERNAL ayrı adaptör yazılacak.

## Snapshot ve veri kalitesi

İş oluşturulurken tarla adı/konumu/sınırı/erişim notları, alan/ürün/alan kaynağı, sınırdan alan/perimetre/compactness, drone model/tank ve planlanan ekip/ayar/dolum erişimi/manuel ulaşım snapshot alınır. Tarla/drone düzenlemesi geçmiş işi değiştirmez. Başlamadan yeniden planlamada drone ve plan ayarları snapshot bilinçli güncellenir ve önceki kayıt audit edilir. İş başladıktan sonra snapshot plan düzenlenemez. Boundary hesaplanan alanı planlanan alanın yerine otomatik koymaz. planlanan alan gerçek işlenen alan ölçümü değildir; ilk sürüm raporu bunu açıkça adlandırır.

REAL/SYNTHETIC kaynak türü müşteri→tarla→iş aktarılır; API'den sentetik kimliği gerçeğe çevrilemez. Gerçek seed yok. Hava entegrasyonu yok; ileride forecastRetrievedAt/forecastTargetAt ve forecastSource snapshot olarak alınacak, gerçekleşen hava ön tahmin girdisi olmayacak. Eksik girdiler null/boş; operatör tahmini ölçülmüş veri gibi sunulmaz.

## Araştırma CSV

Bir satır bir gerçek tamamlanmış iş. Sütunlar job_id, field_group, source, area_origin, target_origin, planned_area_dekar, crop, drone_model, tank_liters, crew_size, growth_stage, refill_access, boundary_area_dekar, perimeter_m, compactness, target_minutes, missing_features, split. Girdi özellikleri iş öncesi snapshot'tandır; gerçek uçuş, dolum sayısı, gider/tahsilat ve sonradan gelen bilgiler girdi olmaz. Kesin tarihler yerine tamamlanma zamanına göre sıralanmış %60/%20/%20 kronolojik etiket bulunur. Zaman bölünme yöntemi manifestte; ham zaman paket dışında. Eşleştirme tablosu, müşteri kimliği, isim, telefon, not, ham parsel ve konum dışarı çıkmaz.

Kararlı tarla araştırma kimliği tarla tekrarını incelemeyi sağlar; nadir ürün/ekipman/alan/şekil kombinasyonu yeniden tanımlanabilir. Hazırlanan paket bir paylaşım adayıdır: insan risk incelemesi, izin ve gerekiyorsa gruplama/sütun bastırma tamamlanmadan yayımlanmaz. Otomatik yayın yapılmaz.

## Deney

İş tamamlama sırasında actualArea (dekar) ve actualAreaOrigin ayrıca girilebilir; bilinmiyorsa null kalır. Panelde işlenen alan toplamı yalnız bu kaydı bulunan işlerden hesaplanır, eksik işleri sıfır saymaz. Planlanan alanın kaynağı snapshot.plannedAreaOrigin olarak ayrıca saklanır. Araştırma CSV'sindeki area_origin planlanan alanın kaynağı, target_origin hedefi oluşturan olayların kaynak türlerinin birleşimidir; bunlar kalite sütunlarıdır, varsayılan model girdisi değildir. Gerçek işlenen alan ön tahmin girdisine eklenmez.

Baseline eğitimde toplam dakika / toplam dekar, tahmin alan×oran. Train'de veri hazırlama; validation'da model seçimi; sonraki zaman testinden tek bağımsız değerlendirme. Aynı tarlanın geçmişte görünmesi ayrı raporlanır. MAE dakika, medyan mutlak hata, hata dağılımı, alan grupları, öğrenme eğrisi ve tahmin zamanı; veri yeterliliği çeşitlilik ve belirsizlik ile değerlendirilir. Sabit satır eşiği başarı garantisi değildir. Gerçek model ve saha pilotu veri erişimini bekler.

## Parsel görüntüleme kaynağı
Parsel modülü kalıcı tarla kaydı üretmez. DEMO sentetiktir; USER_FILE kullanıcı beyanıdır ve resmî doğrulama sayılmaz. Geometri WGS84 [boylam, enlem], yüzölçümü varsa kaynak properties.areaSquareMeters üzerinden m² olarak gösterilir. Eksik alanlar null; dosyadan alan veya nitelik tahmini yapılmaz. Araştırma dışa aktarımına bu görüntülemeler eklenmez. Ayrıntılar PARCEL_MODULE.md.


Tarla alanı ve alan kaynağı artık nullable: kullanıcı formundan bu iki giriş kaldırıldı. Eksik değer null saklanır; geçmiş alan/kaynak değerleri korunur. İş emrinin planlanan alanı ayrı veri olmaya devam eder.


Tarla crop alanı nullable; ürün formdan istenmez, eksik değer null saklanır. Mevcut ürün ve iş snapshot değerleri korunur.


## Aktif kayıt deposu — 16 Ekim 2026
Supabase PostgreSQL saha şeması aktiftir. users, sessions, customers, fields, drones, work_orders, operation_events, expenses, payments, audit_logs, prediction_snapshots, model_versions ve research_exports sunucu Prisma bağlantısıyla kullanılır. Supabase Auth kullanılmaz; mevcut bcrypt parola özeti ve HttpOnly/CSRF oturum modeli korunur. Tablolar anon/authenticated/service_role Data API erişimine kapalı ve RLS etkindir. PostgreSQL sunucu bağlantısı dışında tarayıcı doğrudan bu tablolara erişmez. Yerel kaynak kayıtları yedeklenip hash doğrulamasıyla taşındı; eski sessions taşınmadı.

# Hava tahmini ek sözleşmesi — 16 Ekim 2026

## Yol entegrasyonu ek sözleşmesi —17 Ekim2026
fields.roadAccess ve planning_profiles.baseLocation: WGS84 longitude/latitude, OPERATOR_CONFIRMED kaynağı, gerekçe, confirmedAt/confirmedById ve tarlada geometri hash'i. Alan hesabı bu araç giriş noktasından yapılmaz; sınır geometrisi kullanılır. Geometri değişince eski giriş yeni matrise alınmaz. DB JSON kayıtları uygulamada doğrulanır; teyit fiziksel erişim garantisi değildir.

travel_matrices: profil ve kullanıcı Restrict ilişkisi, kanonik girdi hash'i, profil/istek sürümleri ve teyitli noktaların snapshot'ı, retrievedAt/expiresAt timestamptz.15 dakika geçerlilik. Input.sourceType REAL/SYNTHETIC/MIXED; kaynak türü ve input.sources kaynakları gerçek/sentetik ayrımını korur. Payload.source ROAD_NETWORK_ESTIMATE farklı bir kavramdır; API tahmininin saha ölçümü olmadığını belirtir. Yönlü durationSeconds saniye, minutes yukarı yuvarlanmış dakika, meters metre, reachable=false için süre/mesafe null. Aynı koordinat veya yön tersliği sıfırla doldurulmaz.

travel_routes: plan, profil ve oluşturan kullanıcıya Restrict ilişkileri; plan/profil başına tek değişmez yol çizgisi, API toplam metre/dakika, alınma zamanı, kaynak atfı ve sourceType. Geçmiş kayıt nokta değişince yeniden yazılmaz. Directions sonucu plan saatlerini otomatik değiştirmez. RLS açık ve doğrudan Data API istemci rolleri kapalıdır. Bu tablolar ve hassas koordinat/teyit gerekçeleri kamu araştırma paketine dahil değildir.
`weather_forecasts` Supabase saha şemasındadır. Her kayıt tarla ve oluşturan kullanıcıya Restrict ilişkisi taşır; hedef gün YYYY-MM-DD, retrievedAt/issuedAt/validFrom/validTo timestamptz, issuedAt bilinmiyorsa null. Payload: istenen ve model grid konumu, provider, adapterVersion, usageMode=RESEARCH, dataType=FORECAST, saatlik validAt UTC, rüzgâr/hamle m/s (10 m), yön derece, sıcaklık °C ve nem % (2 m), yağış mm, yağış olasılığı %. Hamle önceki saat maksimumu; yağış önceki saat toplamı. Eksik ölçümler null kalır; veri saha ölçümü değildir. Kayıtlar değişmez snapshot olarak eklenir; inputHash ve alınma zamanı önbellek indeksidir. Yetki yalnız yönetici; RLS açık, doğrudan istemci rolleri kapalıdır. Hassas konum ve ayrıntılı zaman içeren payload kamu araştırma CSV'sine dahil değildir. Silme/aktarma için eski yerel yedeğin weather_forecasts içermediği dikkate alınmalıdır.


## Fiyatlandırma sözleşmesi (COST_PLUS_V1)
price_items: UUID, ad, SERVICE/CHEMICAL/OTHER kategori, DEKAR/LITER/KG/FIXED birim, numeric(14,2) unitCost TL, aktiflik, sürüm, timestamptz oluşturulma. Yönetici erişimi; audit ile güncelleme/arşiv, fiziksel silme API'si yok. RLS açık, doğrudan API rolleri yetkisiz.
pricingSnapshot: geometriden hesaplanmış dekar (0,001), hesap anındaki geometri, kaynak, kalem UUID/sürüm/ad/birim/miktar/birim maliyet/satır toplamı, toplam maliyet, maliyet üzerine kâr yüzdesi/tutarı, son TL fiyatı, zaman ve yuvarlama yöntemi. Miktarlar toplam litre/kg/adettir; doz değildir. DEKAR miktarı sunucudan gelir. Tüm parasal hesaplar Decimal; sayısal PostgreSQL alanları numeric. Kalem ve kâr ROUND_HALF_UP ile 2 basamağa yuvarlanır. Geçmiş snapshot değişmez; bekleyen randevuyu düzenleme yeni fiyat teyidi gerektirir ve önceki değer audit'te kalır. Eski manuel fiyat kayıtları korunur. Finans snapshot'ları kamu araştırma paketine eklenmez.
