> Güncel karar · 18 Ekim 2026: Randevu kaydedildiği anda kararlaştırılmış tutar Kasa → Alacaklar ve müşteri hesabına dahil edilir. Bekleyen talep iptal gerekçesiyle iptal edilince alacak düşer. Programa alınan talep bağlı iş üzerinden yalnız bir kez sayılır; iş iptali alacağı kaldırır. Erteleme alacağı kaldırmaz. Tahsilat yalnız iş tamamlandıktan sonra açılır. Ödemeli iş iptali engellenir; ödeme silinmez, gerekçeli düzeltme gerekir. Eski bağımsız iş emirleri tamamlanınca alacak oluşturur. Bu karar aşağıdaki önceki “yalnız tamamlanan işler” kuralının yerini alır. Yeni tablo/migration gerekmez; mevcut randevu ve iş kayıtları esas alınır.

# Müşteri hesabı ve iş sonu tahsilat planı

Tarih: 18 Ekim 2026
Durum: İlk aşama uygulandı ve 18 Ekim 2026 tarihinde doğrulandı. Gerçek işletme pilotu bekliyor.

## Amaç

Yönetici, iş sonunda hizmet bedelini, alınan ödemeyi ve kalan müşteri borcunu tek akışta yönetebilsin. Alacak, veresiye ve tahsilat durumu açık olsun. Mevcut ödeme/bedel düzeltme/Decimal altyapısı incelenerek genişletilecek; mevcut kayıtlar korunacak.

## 1. İş sonu ödeme adımı

- İşi tamamla sonrasında hizmet bedeli ve kalan tutar gösterilecek.
- Tamamı ödendi: mevcut kalan bedel tahsilat olarak kaydedilecek.
- Kısmi ödeme: alınan tutar girilecek, kalan borç hesaplanacak.
- Veresiye: tahsilat oluşturulmayacak; isteğe bağlı ödeme tarihi kaydedilecek.
- İşin tamamlanması ile ödeme durumu ayrı tutulacak. Ödeme girilmemesi işi tamamlamayı engellemeyecek.
- Operatör işi tamamlayabilecek; finans işlemlerini yalnız yönetici yapabilecek. Yetki API'de de korunacak.

## 2. Müşteri hesap kartı

- Toplam hizmet bedeli (hizmet düzeltmeleri dahil), toplam ödeme ve kalan borç.
- Tarih sırasıyla işler, bedel düzeltmeleri ve ödemeler.
- Ödeme al düğmesi.
- İptal edilmiş/yapılmamış talepler otomatik müşteri borcu sayılmayacak. Mevcut rapor davranışı incelenip tahakkuk kuralı açıkça belgelenecek; geçmiş veriler sessizce değiştirilmeyecek.

## 3. Kasa ekranı

- Alacaklar: borcu kalan müşteriler, kalan tutar ve varsa vade.
- Tahsilatlar: alınan ödemeler ve tarih filtresi.
- Giderler: işletmenin harcamaları, mevcut gider kayıtlarıyla uyumlu.
- Vadesi geçen borçlar belirgin gösterilecek; vadesiz borç gecikmiş gibi gösterilmeyecek.

## 4. Ödeme kaydı ve dağıtım

- Tutar, tarih, yöntem (nakit / havale-EFT / diğer) ve isteğe bağlı açıklama.
- Birden fazla işi kapsayan müşteri ödemesi, varsayılan olarak en eski açık işten başlayarak dağıtılacak.
- Yönetici dağılımı kaydetmeden önce görebilecek ve değiştirebilecek.
- Tek işlemde atomik kayıt; dağıtım toplamı tahsilat tutarına eşit olmalı. Aynı müşterinin açık bakiyesi aşılmamalı. İlk aşamada fazla ödeme kabul edilmeyecek.

## 5. Düzeltme ve güvenilirlik

- Yanlış ödeme/bedel gerekçeli düzeltilecek; önceki değer ve yapan kullanıcı audit kaydında korunacak.
- Mükerrer istek/çift tıklama aynı ödemeyi iki kere oluşturmamalı.
- Başarısız istek ödendi olarak gösterilmemeli; girilen bilgiler korunmalı.
- Tüm parasal hesaplar Decimal, veritabanında numeric/decimal. Binary float ile bakiye hesabı yapılmayacak.
- Yükleniyor, boş liste, eksik bilgi ve hata durumları açık olacak.
- İç işletme takibidir; resmî muhasebe, fatura, otomatik ödeme veya banka entegrasyonu değildir.

## Uygulama sırası

1. Mevcut payments, work_orders, customers, audit_logs; finans endpoint'leri ve testlerini incele. Tahakkuk/vade/dağıtım sözleşmesini netleştir.
2. Gerekli additive migration ve sunucu doğrulamalarını ekle; veritabanı reseti yapma.
3. İş sonu tam ödeme, kısmi ödeme ve veresiye akışını uygula.
4. Müşteri hesap kartı ve alacak listesini ekle.
5. Toplu müşteri ödemesi ve açık işlere dağıtımı ekle.
6. Yetki, Decimal bakiye, kısmi ödeme, veresiye/vade, mükerrer istek, eşzamanlı tahsilat, düzeltme geçmişi ve dağıtım kontrollerini çalıştır.
7. Müşteri → tarla → randevu/iş → operasyon → tahsilat → kalan bakiye akışını uçtan uca doğrula. Her aşamada typecheck/build ve ilgili kontrolleri çalıştır; README/DATA_SPEC ve çalışma durumunu güncelle.

## İkinci aşamaya bırakılanlar

- Fazla ödeme / müşteri avansı.
- Müşteriye para iadesi.
- Tedarikçiye borç ve işletmenin ödeyeceği borçların takibi.

## Devam noktası

Uygulama sırasının 1–7 adımları tamamlandı. Doğrulama: 78 birim/UI render testi; PostgreSQL finans ve mevcut operasyon akışı; 22 tablo/RLS ve tekrar çalıştırılabilir Supabase SQL testi. Gerçek işletme pilotu yapılmadı. İkinci aşama fazla ödeme, iade ve tedarikçi borçları bekliyor. Google Maps güzergâh aktarımı yalnız GOOGLE_MAPS_ROUTE_PLAN.md içinde planlandı.

