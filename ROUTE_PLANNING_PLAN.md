# Randevu, hava ve günlük rota planı

Durum: randevu, hava ve yol entegrasyonunun çekirdeği uygulandı; kapsamlı ekip/revizyon ve gerçek pilot bekliyor. Güncelleme:17 Ekim2026. Bu belge mevcut çalışan çekirdeğe ek geliştirmeleri tanımlar. Önceki ML smoke/pilot ve farklı parsel hatası takiplerini kapatmaz. Güncel kullanım ROAD_WORKFLOW.md ve çalışma durumu PLANNING_HANDOFF.md içindedir. Sonraki aşamalar aşağıdaki güncel durum tablosuna göre ele alınmalıdır.

## Güncel aşama durumu —17 Ekim2026

| Aşama | Uygulanan / kalan |
|---|---|
| P1 | Esnek talep ve tek kişi kapasitesi çalışıyor. Bağımsız tek kişilik ekipler var; çok kişili/ortak araç modeli kalan iş. |
| P2 | Haritada depo/giriş teyidi ve ORS yol adayı çalışıyor. Ayrıntılı teyitli saha koşulları kalan iş. |
| P3 | Polygon/MultiPolygon alanı ve kaynaklı profil süresi snapshot'ı çalışıyor. Gerçek model/pilot veri bekler. |
| P4 | Saatlik hava ve kaynaklı politika penceresi çalışıyor. Ticari hava servis koşulu ve gerçek saha doğruluğu ayrıca doğrulanmalı. |
| P5 | Kalıcı yönlü API matrisi,15 dk cache, eski/değişen giriş kontrolü, Directions ve açık manuel fallback çalışıyor. Gerçek tarla yolu pilotu kalan iş. |
| P6 | Düzenlenebilir sıra, deterministik2-opt önerisi, mesai/müşteri/hava/kaynak kontrolü var. Öncelik/tercih cezaları ve gelişmiş filo optimizasyonu kalan iş. |
| P7 | Atomik onay ve operatöre kayıtlı güzergâh/hava var. Tam gün içi revizyon/sürükle-bırak ekranı ve bildirimler kalan iş. |
| P8 | Sentetik20 iş ve izole E2E geçti; gerçek pilot/başarım henüz yok. |

## Hedef kullanıcı akışı

Örnek: Ayın 20'si için 20 ilaçlama talebi gelir. Yönetici talepleri değerlendirir; sistem işlerin saha sürelerini, ekip kapasitesini, müşteri zaman aralıklarını, yol sürelerini ve tahmini hava pencerelerini kullanarak düzenlenebilir günlük taslak üretir. Kapasiteye sığmayan işler gerekçesiyle dışarıda kalır. Yönetici taslağı onaylayınca kesin program oluşur. Gün içinde değişiklik yeni taslak/sürüm üretir. Müşteriye bildirim ayrı ve açık kullanıcı onayı gerektiren entegrasyondur; otomatik mesaj gönderilmez.

Rota, taşıma aracı/ekibin karayolu iş sırasıdır; drone uçuş rotası değildir. Parsel sınırı yol, tarla giriş noktası veya uçuş izni sağlamaz. Sistem ilaç seçimi, doz ve teşhis tavsiyesi üretmez; drone'a komut göndermez. Tahmini hava sonucu sahada güvenlik/uygunluk garantisi olarak sunulmaz.

## Mevcut altyapı

- Express/TypeScript API, Prisma/PostgreSQL Supabase saha şeması; users/sessions/customers/fields/work_orders/drones/operation_events/expenses/payments/audit_logs mevcut.
- İş emirlerinde plannedStart/plannedEnd, sequence, operatorId/droneId ve snapshot mevcut. Atama/çakışma ve durum değişikliği kontrolleri mevcut.
- Günlük manuel sıra ve manualTravelMinutes/serviceMinutes taslağı mevcut; rota optimizasyonu yok.
- TKGM parsel sınırı yerel geliştirme testi ve MapTiler uydu çalışıyor. Open-Meteo araştırma hava entegrasyonu ve OpenRouteService yönlü yol matrisi/Directions entegrasyonu mevcut.
- Tarla formundan alan/ürün girişleri kullanıcı isteğiyle kaldırıldı. Geri eklenmeyecek. Parsel sorgusundan otomatik hesaplanan alan iş emrine snapshot olarak aktarılacak; saha süresi otomatik profile/baseline hesabıyla üretilecek. Eksik süre/saha verisi sıfır yapılmayacak.

## İki ayrı çalışma süreci

### Tek kişi / tek ekip — varsayılan
İşletme ilk açılışta tek kişi akışıyla çalışır. Ek ekip, yardımcı personel veya araç filosu tanımlama zorunluluğu yoktur. Yönetici sahaya kendisi çıkabilir; görev ataması/API izinleri bu yetkiyi destekleyecek şekilde düzenlenir, sahte ikinci operatör hesabı istenmez. Bir günlük mesai, başlangıç/depo noktası ve drone profili bir kez ayarlanır. Talep listesi → otomatik alan/süre → hava/yol değerlendirmesi → tek günlük sıra → onay → operasyon akışı izlenir. Aynı kişi için iki eşzamanlı iş planlanamaz; paralel iş kapasitesi varsayılmaz.

### Çoklu ekip — isteğe bağlı
Yönetici çoklu ekip modunu seçtiğinde bağımsız hareket eden kaynak grupları tanımlar. Bir ekip tek kişiden oluşabilir. Her grubun operatörleri, taşıma aracı, drone/ekipman, mesai ve başlangıç/bitiş noktası vardır. Aynı 20 talep uygun ekiplere dağıtılır; her ekip için ayrı sıra/zaman çizelgesi çıkar. Ortak kişi, araç veya drone aynı saatte iki grupta kullanılamaz. Aynı araçtaki iki drone otomatik olarak iki bağımsız rota değildir. Kapasite, müşteri penceresi ve hava kısıtları her atamada tekrar kontrol edilir. Bitmiş/devam eden iş kilitlenir; ekip değiştirme yönetici onaylı revizyondur.

İlk teslim tek kişi/tek ekip; ikinci kapasite teslimi çoklu ekip olacaktır. Veri modeli genişlemeye açık tutulur ama tek kişi ekranına ekip yönetimi yükü bindirilmez.

## Aşama P1 — Randevu talebi ve kapasite

Önce yönetici mevcut müşteri adına talep oluşturur; müşteriye yeni rol/hesap zorunluluğu getirilmez. Müşterinin kendisinin dolduracağı halka açık form ayrı bir sonraki geliştirmedir; yönetici onayı olmadan kesin saat/iş ataması oluşturamaz.

Kullanıcının onayladığı temel randevu bilgileri: **müşteri, tarla, hizmet, istenen gün, uygun saat aralıkları ve tarih esnekliği**. Alan ve süre kullanıcıdan her talepte yazılması istenmez; parsel ve süre profili üzerinden otomatik hazırlanır. Öncelik/gerekçe ve zaman kısıtının katı mı tercih mi olduğu gerektiğinde yönetici detaylarıdır. Müşterinin tüm gün uygun olması açık seçimdir; eksik pencere sessizce tüm gün sayılmaz.

Kaynaklar seçilen çalışma sürecine göre açılır. Tek kişi modunda yalnız işletmecinin mesaisi, drone profili ve başlangıç/bitiş noktası gerekir; yardımcı zorunlu değildir. Çoklu ekip modunda bağımsız grupların araç/operatör/drone uygunluğu ayrı yönetilir.

Yeni olası varlıklar: appointment_requests, appointment_windows, crews, crew_members, vehicles, crew_shifts. Onaylanmış talep mevcut work_orders kaydına bağlanır; durum eşlemesi belgelenir. İlgisiz ödeme/operasyon kayıtları tekrarlanmaz.

Kabul: 20 talep kaydedilebilir, talep ile kesin randevu ayrılır, zaman pencereleri Europe/Istanbul gösterilir, aynı kaynaktaki kesin çakışmalar sunucuda engellenir. Halka açık form ilk sürümde eklenmez.

## Aşama P2 — Parsel ve saha hazırlığı

TKGM geometrisinden uygun görüntüleme merkezi ve sürümlü şekil özellikleri çıkarılabilir; bunlar doğrulanmış yol giriş noktası veya gerçek tarla koşulu değildir. Yol servisi en yakın erişim noktasını aday olarak verir; yönetici/operatör bir kez doğrular, müşteri elle sınır çizmez. Ulaşılamayan, çok uzakta eşleşen veya yola oturmayan giriş planlamayı bloke eder.

İsteğe bağlı saha bilgileri: dolum erişimi, araç erişim durumu, engel/not, ekip hazırlık ihtiyacı, sulama/zemin durumu, komşu hassas alan/yön kısıtı işletmede biliniyorsa. Kaynak measured/operator_estimate/external/unknown, ölçüm-zamanı ve teyit durumu saklanır. Eğim/zemin/ıslaklık uydu görüntüsünden kesin sonuç diye üretilmez. Ek DEM/veri servisi ayrı doğrulanır. Serbest not otomatik güvenlik kararı yapmaz.

Kabul: eksik geometri, giriş, süre ve teyit bilgileri liste halinde görünür; otomatik rastgele konum veya sözde erişim yoktur.

## Aşama P3 — Otomatik alan ve saha süresi

1. Ada/parsel sorgusundan gerçek sınır geometrisi alınır. Doğrulanmış geometri üzerinden coğrafi yüzey alanı hesaplanır; iç boşluklar düşülür, ayrık MultiPolygon parçaları toplanır. Harita ekranındaki piksel alanı kullanılmaz. Sonuç m² ve dekar (m² / 1000) saklanır. Bu değer geometri hesabıdır, tapu yüzölçümü veya yerinde ölçüm gibi etiketlenmez.
2. Kaynakta beyan edilen yüzölçümü varsa ancak alan adı/birimi doğrulanınca ayrı saklanır. Kaynak alanı ile geometri hesabı birbirinin üzerine yazılmaz; fark varsa gösterilir. Kaynak/geometri güncellenince geçmiş iş snapshot'ı değişmez.
3. İlk sürüm parselin tamamına hizmet varsayımını açık gösterir. Toplam parsel alanı ile işlem yapılacak alan ayrı kavramlardır. Kısmi uygulama desteklenene kadar sistem eksik alanı tam parselmiş gibi kesinleştirmez; yöneticiye açıklanmış alternatif süreç gerekir. Müşteriye yeniden alan, ürün veya koordinat kutusu eklenmez.
4. İşletmeci drone/hizmet profili için bir defa başlangıç/hazırlık süresi, etkin dakika/dekar ve kapanış süresini tanımlar. **İlk otomatik profil tahmini = hazırlık + işlenecek dekar × etkin dakika/dekar + kapanış.** Katsayılar burada uydurulmaz; işletmeci bilgisi veya geçerli geçmiş kayıtlardan gelir. Bu profil 'AI' veya ölçülmüş gerçek süre değildir; girdiler/kaynak ve sürüm görünür. Tek kişi ve yardımcıyla çalışma farklı profiller olabilir.
5. Etkin dakika/dekar saha içindeki uçuş, dolum, batarya ve olağan bekleme payını kapsıyorsa bunlar ikinci kez eklenmez. Alternatif bileşenli model kullanılacaksa her bileşenin kapsadığı süre ayrı belgelenir; iki model karıştırılmaz. Karayolu süresi bu hesaba dahil değildir.
6. Gerçek operasyon verisi toplandıkça karşılaştırma için alan × eğitim dönemi ortalama dakika/dekar baseline ayrıca korunur; başlangıç profil formülüyle aynı yöntem diye raporlanmaz. İleride doğrulanmış süre modeli seçilebilir; mevcut araştırmanın zaman sıralı bağımsız testi ve veri sızıntısı kuralları korunur.
7. Rota hesabı bu otomatik saha süresini kullanır. Hava, tek başına her işe gelişigüzel bir yüzde eklemek için kullanılmaz; uygun pencereyi belirler. Eğim, şekil, erişim ve ekip etkileri ancak kaynağı/hesap yöntemi tanımlıysa süreye yansıtılır. Parametre veya sınır eksikse 'süre hesabı için eksik yapılandırma' gösterilir; her müşteri için manuel süre girmeye zorlamak yerine eksik işletme profili tamamlanır.

Tahmin snapshot'ı: parsel kaynağı/alınma zamanı, geometri sürümü/hash, hesaplanan m²/dekar, varsa beyan alanı, işlem kapsamı, ekip/drone/hizmet profili, katsayılar ve kaynakları, yöntem/sürüm, tahmin zamanı, toplam dakika. Kullanıcı dostu ekranda alan/süre otomatik ve salt okunur özet olarak görünür. Tampon ayrı bir planlama politikasıdır; doğrulanmış güven aralığı sayılmaz.

Kabul: farklı alanlarda otomatik sonuç değişir; dekar dönüşümü, delik/MultiPolygon, sıfır/geçersiz geometri, kaynak alanı farkı, eksik profil ve tek/çok kişi profili test edilir. Bir kaydın gerçekleşmiş süresi aynı işin ön tahmin girdisine giremez. Geçmiş iş alanları/tahminleri sonradan değişmez.

## Aşama P4 — Saatlik hava pencereleri

Sağlayıcı adaptörü ile konuma ve hedef zamana göre saatlik tahmin alınır: rüzgâr hızı/yönü, hamle, yağış/olasılık, sıcaklık ve bağıl nem; gerekirse açıklanmış güneş doğuş/batış bilgisi. Veri 10 m gibi bir yükseklikteyse açıkça saklanır; drone çalışma yüksekliğinde ölçüm gibi gösterilmez. Izgara tahmini tam tarla ölçümü değildir. Toprak/ilaçlama uygunluğu yalnız bu değişkenlerden kesinleştirilmez.

Eşikler sayısal olarak bu belgede uydurulmaz. İlgili drone/ekipman üretici sınırları, işletmenin doğrulanmış prosedürleri ve hizmete uygulanabilir kısıtlar üzerinden yönetici tarafından sürümlü weather_policies tanımlanır. Politika kaynağı/inceleme tarihi gerekir. Rüzgâr yönünün etkisi ancak duyarlı komşu alan yönü gibi veri varsa değerlendirilebilir; salt yön değeri yeterli değildir.

weather_forecasts: sağlayıcı, konum/ızgara, issuedAt (varsa), retrievedAt, validFrom/To, değişkenler/birimler, tahmin türü ve kaynak sürümü. Aynı hücre için istekler cache edilir, kota/gizlilik gözetilir. Ticari kullanım koşulları doğrulanır. Tahmin ufku dışındaki gün sadece talep olarak tutulur; hava uydurulmaz. Son kullanma süresi geçen/veri alınamayan iş 'uygunluk bilinmiyor'dur.

Her işin tüm saha aralığı politikanın gerektirdiği şekilde kontrol edilir; sadece başlangıç saati yetmez. Sonuçlar 'tahmine/politikaya göre aday pencere', 'uygun pencere yok', 'veri/teyit eksik' şeklindedir. Sahada son karar yetkili operatördedir; sert limitler yönetici sürüklemesiyle sessizce aşılamaz.

Kabul: yağış/rüzgâr hamlesi nedeniyle kesilen pencere, eksik veri, eski tahmin, uzun işin pencereye sığmaması ve yanlış birim testleri geçer. Onay öncesi ve gün başlangıcında tekrar kontrol edilir; politika ve forecast snapshot geçmişte değişmez.

## Aşama P5 — Gerçek yol süreleri

Yetkili/lisanslı Directions + Matrix sağlayıcısı seçilir. İlk etap manuel dakika fallback'i açıkça etiketlidir. Kuş uçuşu mesafe yol süresine çevrilip gerçek rota diye sunulmaz. Köy/tarla yollarında harita hatası olabileceği gösterilir; yönetici saha bilgisiyle düzeltir ve gerekçe saklanır.

20 iş + başlangıç/bitiş + gerekli depo/dolum durakları için yönlü süre matrisi kurulur (A→B, B→A farklı olabilir). cache kaydı sağlayıcı, araç profili, erişim noktaları, trafik/tahmin varsayımı, alınma zamanı ve varsa geçerlilik zamanını içerir. Süre dakika, mesafe metre; null ulaşılabilir olmayan/eksik veri anlamına gelir. Çizilen rota yol servisinin çizgisidir, sınırların merkezlerini birleştiren çizgi yol rotası diye etiketlenmez.

Kabul: karşı yön farkı, ulaşılamayan parsel, servis kesintisi, manuel değişiklik ve API kotası yönetilir. Uydu anahtarı yol servisi anahtarı varsayılmaz.

## Aşama P6 — Düzenlenebilir rota önerisi

İlk sürüm Node/TypeScript içinde uygulanır: önce zaman/politika kısıtlarıyla mümkün yerleştirme, sonra feasible insertion ve 2-opt gibi iyileştirmeler. Her değişiklikten sonra bütün günün saatleri, yol/saha süreleri, zaman pencereleri, hava ve kaynak çakışmaları yeniden doğrulanır. Yalnız 'en yakın tarlayı seç' kullanılmaz. Yol matrisi yönlüdür. Arama zaman sınırı ve seed/sürüm tekrarlanabilir olmalıdır; sonuç küresel optimum garantisi taşımaz.

Öncelik sırası: katı kısıtlara uyum → karşılanamayan zorunlu iş/öncelik → gecikme/tercih cezaları → yol süresi ve fazla mesai. Tek ağırlıklı skorla güvenlik ihlali satın alınamaz. Yumuşak cezalar yöneticinin anlayacağı gerekçelerle sürümlenir. Tüm 20 işi yapmayı zorlamak yerine sığmayan iş nedenleri ve başka gün ihtiyacı gösterilir.

Ekip dolum/batarya/enerji durakları ilk etap manuel; miktar/kapasite ölçülmeden otomatik hesaplanmaz. Sonra kaynak kapasitesi ve depo dönüşleri eklenir. Tarladaki hazırlık içi dolumlar ile yol üstü depo ziyaretleri ayrılır.

Çok ekip ve karmaşık kapasite aşamasında OR-Tools VRPTW gibi ayrı solver değerlendirilebilir. Gerekirse ayrı servis olur; Python temel web uygulamasının zorunlu bağımlılığı haline getirilmez. Optimizasyon, ML saha süresi modelinden ayrı test edilir.

Kabul: manuel sıra ve öneri aynı girdilerle karşılaştırılır; yol/saha/bekleme/toplam süre ayrı raporlanır. 'Öneri' olarak sunulur; tasarruf yüzdesi veya optimal rota garantisi verilmez.

## Aşama P7 — Yönetici onayı ve operatör günü

Ekran: solda bekleyen iş havuzu (ör. 20), ortada ekip bazlı zaman çizelgesi, sağda uydu haritası ve karayolu güzergahı. Her kartta müşteri/tarla, ziyaret sırası, tahmini varış/başlangıç/bitiş, yol/saha süresi, hava durumu ve eksik veri nedenleri. İş sıra/durak/ekip sürükle-bırak ile değiştirilebilir, ancak sunucu yeniden doğrular.

Taslak 'gün planını onayla' ile tek transaction içinde kaydedilir; plan revizyonu ve mevcut kaynak atamaları kontrol edilir, eşzamanlı iki yöneticinin eski taslağıyla çakışma oluşturması engellenir. Onaylanan iş emirlerinde planlanan zaman/sıra kaynakları güncellenir; audit trail korunur. Kısmi kayıt/publish yoktur. Müşteriye kesin saat bildirimi onaydan sonra, ayrıca yetkilendirilmiş bildirim modülüyle yapılabilir.

Operatör yalnız kendi onaylı rotasını görür. Devam eden/tamamlanan işler gün içi yeniden sıralamada kilitlidir. Trafik/gecikme/hava değişince yeni öneri taslağı oluşur; yönetici onayı olmadan kesin program değişmez. Kısıt ihlali olan bir öneri zorla 'uygun' gösterilmez. İptal/erteleme gerekçesi ve müşteri yeniden teyidi kaydedilir.

Kabul: 20 talep → öneri → yönetici değişikliği → atomik onay → operatör görünümü → operasyon olayları akışı gerçek Supabase'de doğrulanır; demo kayıtlar sentetik işaretlenir.

## Aşama P8 — Pilot, ölçüm ve araştırma

İlk olarak açıkça sentetik senaryolarla test: 20 işin hepsi sığan gün, kapasiteyi aşan gün, değişen rüzgâr/yağış, iki ekip, sabit randevu, eksik giriş, servis kesintisi, tamamlanan işin yeniden planlanması ve eşzamanlı onay. Sentetik başarı saha başarısı değildir.

Gerçek pilotta planlanan/gerçekleşen yol, saha ve bekleme süreleri, geç kalma, elle düzeltmeler, erteleme nedenleri, çözücü süresi ve veri eksikliği ölçülür. Hava tahmini ile sahadaki ölçüm farklı veri türleridir. Araştırma dışa aktarımında müşteri, hassas konum/güzergah ve ham detaylı tarih varsayılan paylaşılmaz.

Planlayıcı için job başına gözlenen sonuçlar ve senaryo/sürüm kimlikleri ayrı tutulur. Süre modelinin test bölmesi ve MAE değerlendirmesi mevcut araştırma sorusunu korur. Gerçekleşen yol/dolum/iş sonu gideri ön tahmin özelliği yapılmaz. Günlük sıralama performansı ayrı deneydir; süre tahmini iyileşti diye rota iyileşmiş sayılmaz.

## Veri modeli önerisi (uygulama sırasında kesinleşecek)

appointment_requests + appointment_windows; crews + crew_members + crew_shifts + vehicles; field_access_points + field_conditions; weather_policies + weather_forecasts; travel_matrices + travel_legs; daily_plans + daily_plan_versions + daily_plan_stops. Mevcut work_orders/prediction_snapshots/audit_logs yeniden kullanılır. Tüm kayıtlar Supabase saha şemasında; yönetici/atama rol sınırı API'de uygulanır. Tarihler timestamptz, gösterim Europe/Istanbul. Snapshotlar append/revision mantığıyla korunur. Para hesapları decimal kalır; eksik süre/konum/hava sıfırlanmaz.

## İlk tasarım teslim sırası (arşiv; güncel tabloyu esas alın)

P1: onaylanan altı randevu alanı + tek kişi için mesai/drone profili + günlük kapasite ekranı. P2/P3 tesliminde parselden otomatik alan ve saha süresi eklenir. Sonraki kapasite teslimi çoklu ekip ekranı ve iş dağıtımıdır. Henüz hava veya optimum rota varmış gibi gösterilmeyecek. Sonra P2/P3, P4, P5, P6, P7, P8 sırasıyla. Her teslim typecheck/build + ilgili testler, veritabanı migration ve tamamlanan/bekleyen işler belgesi içerir. Ücretli servis satın alma veya müşteri mesajı otomatik yapılmaz.

## Doğrulanan teknik kaynaklar

- OR-Tools zaman pencereli araç rotalama: https://developers.google.com/optimization/routing/vrptw
- Open-Meteo tahmin değişkenleri/saatlik API: https://open-meteo.com/en/docs (sağlayıcı adayı, ticari lisans/hesap henüz seçilmedi)
- openrouteservice Directions/Matrix: https://openrouteservice.org/services/ (sağlayıcı adayı; hesap, kota ve kullanım koşulları seçimde doğrulanacak)

## Hava sağlayıcısı kararı — 16 Ekim 2026
İşletme başlangıcı için WeatherAPI.com seçildi; değerlendirme ve sıra WEATHER_API_DECISION.md içinde. Sunucu adaptörü ve ayar durumu hazır, anahtar/snapshot/cache/uygunluk entegrasyonu bekliyor. Ücretsiz3 günlük pencere20 Ekim örneğini bugün kapsamaz;7 günlük plan gereksinimi açık tutulur. Randevu P1 henüz tamamlanmadı.

# Güncel hava ilerlemesi — 16 Ekim 2026
Kullanıcı onayıyla Open-Meteo geliştirme/araştırma entegrasyonu uygulandı; önceki WeatherAPI seçimi değişti. Yönetici tarla/gün seçerek24 saatlik hava tablosu alır. Supabase weather_forecasts snapshot,15 dakika cache, rol/CSRF kontrolü hazır. Ücretsiz adaptör production ortamında kapalı. P4'ün veri toplama/gösterim alt işi tamamlandı; uygunluk politikaları, randevu ve rota entegrasyonu bekliyor. İlk tamamlanmamış aşama P1 olmaya devam eder. Ayrıntılar WEATHER_API_DECISION.md.


## 16 Ekim 2026 — Kullanıcı isteğiyle duruldu
Randevu/planlama geliştirmesinde tamamlananlar ve son eklerde kalan doğrulamalar PLANNING_HANDOFF.md içinde. Supabase migration uygulandı; planın bütünü tamamlanmış değildir. Rota servisi seçimi yapılmadı. Kullanıcı devam demeden ilerlenmeyecek.
