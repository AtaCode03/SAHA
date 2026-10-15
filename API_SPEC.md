# REST API v1

Tüm yollar `/api`. Login dışındaki kayıt yolları HttpOnly session cookie ister. GET/HEAD dışında Origin=APP_ORIGIN ve x-csrf-token gerekir. GET /auth/me token ve kullanıcı rolünü döner. POST /auth/logout mevcut oturumu, POST /auth/revoke-all kullanıcının bütün oturumlarını iptal eder. Login denemesi 15 dakikada IP başına 10 ile sınırlı.

Hata: `{error:{code,message,details?}}`. 401 oturum, 403 rol/atama/CSRF, 404 kayıt, 409 çakışma veya eşzamanlı değişiklik, 422 doğrulama, 503 servis erişimi. Şema hataları alan yolu ve açıklamasını içerir. Başarısız çağrı kaydedilmiş gibi dönmez.

Liste: `?page=1&pageSize=25&q=...`; en fazla 100; yanıt `{data,total,page,pageSize,q}`. Orders ayrıca `status,from,to` (offset içeren ISO8601). Tarih aralığı `[from,to)`.

| Yol                         | Yöntem      | Yetki / davranış                                                                   |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| /health                     | GET         | PostgreSQL erişimi; yoksa 503                                                      |
| /auth/login                 | POST        | `{email,password}`; yeni session ve csrf                                           |
| /customers                  | GET, POST   | Yönetici; arama / ekleme                                                           |
| /customers/:id              | PUT, DELETE | Yönetici; tam form düzenleme / arşiv                                               |
| /fields                     | GET, POST   | Yönetici; tarla formu, decimal alan metni, Polygon                                 |
| /fields/:id                 | PUT         | Yönetici; tam form düzenleme / active=false arşiv                                  |
| /drones                     | GET, POST   | Yönetici                                                                           |
| /drones/:id                 | PUT         | Yönetici; tam form / arşiv                                                         |
| /operators                  | GET         | Yönetici; yalnız aktif operatör id/name                                            |
| /orders                     | GET, POST   | Okuma yönetici veya kendi ataması; oluşturma yönetici                              |
| /orders/:id                 | GET         | Yönetici veya kendi ataması; operatöre finans verisi çıkmaz                        |
| /orders/:id/schedule        | PUT         | Yönetici; başlangıç/bitiş/atama/sıra/settings; başlamamış ziyaret                  |
| /orders/:id/status          | POST        | Yönetici; geçiş, erteleme/iptal gerekçesi; başlat/tamamla olayla                   |
| /orders/:id/events          | POST        | Yönetici veya kendi ataması; `{kind,at,idempotencyKey,origin}`                     |
| /orders/:id/events/:eventId | PUT         | Yönetici veya kendi ataması; `{kind,at,origin,reason}`; tüm dizi doğrulama / audit |
| /orders/:id/audit           | GET         | Yönetici; en yeni 100 değişiklik                                                   |
| /orders/:id/payments        | POST        | Yönetici; `{amount,at,note?,idempotencyKey}`                                       |
| /orders/:id/adjustment      | POST        | Yönetici; `{adjustment,reason}`; toplam düzeltme TL metni                          |
| /expenses                   | POST        | Yönetici; `{orderIds,kind,amount,at,note?,allocationRule}`                         |
| /reports                    | GET         | Yönetici; from/to; DB'den operasyon/finans                                         |
| /exports/business           | GET         | Yönetici; özel işletme CSV (kişisel veri içerir)                                   |
| /exports/research           | POST        | Yönetici; `{}`; paylaşım adayı dosyalar/manifest; otomatik yayın yok               |
| /orders/:id/prediction      | POST        | Yönetici; başlamadan baseline/null snapshot                                        |
| /planning/suggestion        | GET         | Yönetici; from/to zorunlu; manuel sıra/süre taslağı                                |

Para ve alan JSON'da ondalık metindir (`"1250.50"`, `"12.345"`); virgül yerelleştirilmiş gösterimde kullanılır. Tarihler timezone offset içeren ISO metindir; arayüz Europe/Istanbul (+03:00) gönderir. GeoJSON [boylam,enlem]; koordinat çifti birlikte girilir. Opsiyonel eksik ölçüm null; hiçbir ölçüm sıfırla doldurulmaz.

Durumlar: REQUESTED→PLANNED/CANCELLED, PLANNED→RUNNING/POSTPONED/CANCELLED, RUNNING→COMPLETED/POSTPONED/CANCELLED, POSTPONED→PLANNED/CANCELLED; terminalden dönüş yok. Başlatılmış bir ziyaret tekrar planlanamaz; sonraki saha ziyareti ayrı iş emridir. Olaylar artan zamanlı, gelecekte olamaz; açık uçuş/bekleme kapanmadan başka aralık/tamamlama olmaz. Tekrarlanan olay/ödeme anahtarı farklı payload içerirse 409; eşzamanlı serializable işlem çatışmasında 409 ve güvenli tekrar gerekir.

Kullanıcı sağlama `npm run user:create` ile yapılır; parola/rol yönetim paneli ilk sürümde yok. Aktiflik değişikliği oturumu sonraki istekte geçersiz yapar. Operatör veri DTO'su müşteri ad/telefon/mahalle, tarla erişim/konum, kendi iş programı ve operasyon olaylarıyla sınırlıdır.
