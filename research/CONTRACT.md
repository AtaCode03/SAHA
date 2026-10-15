# Tahmin entegrasyon sözleşmesi v1

Web uygulaması Node.js ile çalışır. Python yalnızca isteğe bağlı çevrimdışı araştırma bileşenidir. Eğitilmiş doğrulanmış gerçek model bulunmadığı için arayüz AI tahmini göstermez.

`POST /api/orders/:id/prediction` yönetici, CSRF ve iş başlamamış koşulu ister. Yalnız gerçek tamamlanmış geçmiş işlerin toplam saha dakikası / toplam planlanan dekar oranını kullanır. Veri yoksa `method=INSUFFICIENT_DATA`, `minutes=null`; varsa `AREA_BASELINE`. Girdi snapshot, zaman ve yöntem sürümü kaydedilir. Baseline başarısı henüz değerlendirilmemiştir.

Gelecekte model adaptörü yalnız `planned_area_dekar`, sınır şekil ölçüleri, ürün/gelişim, drone model/tank, ekip, planlama ayarları, dolum erişimi ve zamanı saklanmış hava tahmini alabilir. Gerçek uçuş, dolum sayısı, nihai gider ve gerçekleşen hava girdi olamaz. Çıktı: `{method, version, minutes, interval?:{lower,upper}, inputSnapshot, predictedAt}`. İmzalı/denetlenmiş model manifesti, bağımsız test raporu ve varsa aralık kapsaması olmadan üretimde ML etkinleştirilemez. joblib dosyaları yalnız güvenilir yerel kaynaklardan açılır.

## Tekrarlanabilir deney

Python 3.12+ ayrı sanal ortamda `pip install -r research/requirements.txt`; `python research/train.py operations.csv --output research/private/output`. Sentetik ve boş veri reddedilir. CSV split sırası dışa aktarımın kronolojik tanımıdır. Train üzerinde imputation/encoding; validation üzerinde Ridge alpha ve RandomForest yaprak boyutu seçilir; test yalnız son değerlendirmedir. Tahmin negatif olursa saklanır ve hata metriğinde gizlenmez; üretim adaptörü ayrıca fiziksel sınır incelemesi ister.

MAE, medyan mutlak hata, hata yüzdelikleri, alan grupları, görülmemiş tarla alt kümesi, tahmin zamanı, öğrenme eğrisi ve açıklamalı bootstrap belirsizliği üretilir. Tekrarlı tarlalar satır bootstrap bağımsızlığını azaltabilir; tarla kümeleriyle bootstrap aralığı ayrıca hesaplanır. İleri zaman tarla-grup doğrulaması saha veri çeşitliliği öğrenildikten sonra genişletilecektir. Saha verisi yok: eğitim çalıştırılmadı, başarı sonucu yok.

`python research/smoke_test.py` yalnız SYNTHETIC veriden yazılım hattını sınar; normal eğitim sentetik veriyi reddeder. Smoke raporu ve model metadata'sı SYNTHETIC/deployable=false etiketi taşır. Bu kontrol gerçek model başarısı değildir. Smoke çıktıları research/private içinde gitignored kalır. Bağımlılıklar requirements.txt içinde doğrudan ve transitif sürümlerle sabitlenir.

## Planlama

İlk sürüm yönetici sırası ve süre bazlı çakışmasız takvimdir. Süre taslağı mevcut sırayı, son baseline/manuel plan süresini ve manuel ulaşım dakikasını kullanır. Eksik ulaşımı kuş uçuşu ile doldurmaz, rota optimizasyonu yaptığını iddia etmez, otomatik kayıt yapmaz. Müşteri zaman aralıklarıyla rota optimizasyonu sonraki ayrı aşamadır. Drone komutu gönderilmez.
