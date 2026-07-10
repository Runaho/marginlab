<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Bunları inceleyip feleride görebilirsin.

Sadece nakit değil hisselerim de etkilidir diye düşünüyorum.
İnceleyip yapacağın düzenlemeleri detaylandırmak istiyorum

Evet, çok doğru düşünüyorsun: bu yapıda yalnızca nakit değil, mevcut hisselerin de teminat değeri buying power’ı etkiliyor.  Senin simülatörde birinci büyük eksik tam olarak bu; şu an tek-hisse ve nakit mantığı var, ama ekran görüntülerin broker’ın hisse değerini de teminat hesabına kattığını açıkça gösteriyor.[^1]

## Ekranlardan çıkan netler

En kritik bilgi şu: ilgili enstrümanda “Collateral value” yüzde 75 görünüyor.  Bu da broker’ın bu tip bir hissede piyasa değerinin tamamını değil, yaklaşık yüzde 75’ini teminat katkısı olarak saydığını düşündürüyor; yani 100 USD’lik uygun hisse değeri, kabaca 75 USD teminat etkisi yaratıyor.[^1]

Önceki hesap ekranındaki 1,351.64 USD hisse/ETF değeri kaba referans alınırsa ve bunların hepsi aynı oranda teminata uygunsa, yaklaşık 1,013.73 USD teminat katkısı oluşur.  Bu yüzden yeni sürümde “available cash” ile birlikte “collateralized stock value” da hesaba girmeli; aksi halde simülatör broker mantığını eksik anlatır.[^2][^1]

Ayrıca broker kural seti de daha netleşmiş durumda: komisyon yüzde 0.25, minimum komisyon 1.00 USD, spread 0.01, satışta US SEC clearing fee yüzde 0.00206 ve custody fee yıllık yüzde 0.05 olarak görünüyor.  Yani simülatörde yalnızca margin faizi değil, giriş-çıkış komisyonu, saklama maliyeti ve satış tarafı masrafı da ayrı ayrı işlenmeli.[^3]

## Maliyet modeli

Gönderdiğin örnekler maliyet motorunu da güzel doğruluyor.  7 hisse ve 1 ay tutma senaryosunda toplam maliyet 4.03 USD ve yüzde 0.516 görünüyor; aynı 7 hisseyi 1 yıl tutunca toplam 4.39 USD ve yüzde 0.562 oluyor, farkın ana kaynağı custody fee’nin 0.03 USD’den 0.39 USD’ye çıkması.[^4][^5][^6][^7]

10 hisse ve 1 yıl örneğinde toplam maliyet 6.27 USD, 22 hisse ve 1 yıl örneğinde ise 13.80 USD görünüyor.  Bu iki ekran bize şunu söylüyor: sabit gibi görünen bazı giderler küçük lotlarda daha sert hissediliyor, ama adet büyüdükçe toplam yüzde maliyet yaklaşık aynı bantta kalıyor.[^6][^4]

Aşağıdaki tablo, simülatöre koymamız gereken broker kurallarını netleştiriyor:


| Alan | Ekrandaki veri | Simülatöre etkisi |
| :-- | :-- | :-- |
| Teminat oranı | %75 [^1] | Hisselerin sadece bir kısmı buying power üretir [^1] |
| Min trade size | 1 share [^1] | Kesirli lot yok varsayımı kullanılmalı [^1] |
| Tick size | 0.01 [^1] | Fiyat adımı ve spread hesabı buna göre yapılmalı [^1][^3] |
| Komisyon | %0.25, min 1 USD [^3] | Open/close ayrı ayrı uygulanmalı [^3] |
| SEC fee | Sell side %0.00206 [^3] | Sadece çıkışta eklenmeli [^3] |
| Custody fee | %0.05 p.a. [^3] | Tutma süresine göre pro-rate edilmeli [^3][^5][^7] |
| İşlem saatleri | Pre-market, automated, after-hours saatleri var [^1] | Emir tipi ve seans etkisi için ayrı mod eklenebilir [^1] |

## Yapacağım düzenlemeler

Birinci düzenleme, simülatörü “single position” modelinden “account engine” modeline çevirmek olur.  Yani formül şu mantığa geçer: toplam kullanılabilir teminat = nakit + her pozisyonun güncel değeri × o pozisyonun collateral oranı.  Böylece Cisco, CSWC, TRIN ve GFS yalnızca izlenen hisseler değil, aynı zamanda yeni alım gücünü etkileyen aktif teminat kalemleri haline gelir.[^8][^1]

İkinci düzenleme, her hisse için ayrı collateral alanı eklemek olur.  Çünkü şu an elimizde bir enstrüman ekranında yüzde 75 oranı var, fakat bunu bütün hisselere körlemesine sabitlemek doğru olmaz; bu yüzden varsayılan yüzde 75 olur, ama kullanıcı her pozisyonda bunu değiştirebilir.  Bu alan özellikle broker bazı hisselerde teminat oranını düşürdüğünde çok önemli hale gelir.[^1]

Üçüncü düzenleme, “collateral shock” motoru eklemek olur. Mevcut hisselerin fiyatı düştüğünde yalnızca portföyün P/L’i bozulmaz; aynı anda teminat katkısı da düşer.  Yani yeni NVDA alımını margin ile açmış olsan bile, bazen margin call’u NVDA değil Cisco veya başka bir eldeki hisse düşüşü tetikleyebilir; simülatörün bunu gösterebilmesi gerekiyor.[^2][^8][^1]

Dördüncü düzenleme, broker masraflarını tam parçalı hale getirmek olur.  Şu anki HTML’de faiz maliyeti var, ama open commission, close commission, minimum 1 USD kuralı, SEC sell fee, custody fee ve spread etkisi ayrı kutular halinde gösterilmeli.  Hatta 1 ay ve 1 yıl tutma arasında maliyet farkını otomatik kıyaslayan küçük bir panel de eklerim.[^5][^7][^3]

## Eğitsel senaryolar

Ben v2’de üç farklı eğitim modu açarım. İlki “yalnızca nakit margin” olur; bu mevcut sürüme yakın kalır ve temel mantığı öğretir.  İkincisi “portfolio-backed margin” olur; burada eldeki hisseler teminat üretir ve onların düşüşü buying power’ı aşındırır.  Üçüncüsü “stress test” olur; burada aynı anda hem yeni alınan hisse hem de mevcut portföy belli oranlarda düşer ve hangi gün maintenance sınırı kırılıyor onu görürsün.[^8][^2][^1]

Ayrıca işlem saati ve emir tipi katmanını da eklemek mantıklı.  Çünkü ekranda market, limit, stop, trailing stop ve stop limit emir tipleri ile pre-market ve after-hours saatleri açıkça görünüyor; dolayısıyla eğitim tarafında “aynı stop emri normal seans dışı nasıl davranır” modülü de faydalı olur.[^1]

## Benim önerdiğim v2 planı

Ben bunu şu sırayla büyütürdüm. İlk adımda portföy tablosu eklenir: Cisco, CSWC, TRIN ve GFS başlangıçta hazır gelir; adet, maliyet, güncel fiyat, collateral rate ve sector alanı olur.  İkinci adımda “new trade” kutusu eklenir; örneğin NVDA ya da başka bir hisse seçilir ve broker’ın bu yeni işlemi mevcut teminat yapısıyla onaylayıp onaylamadığı gösterilir.  Üçüncü adımda “cascade risk” paneli gelir; burada mevcut hisseler yüzde 10, 20, 30 düşerken yeni trade ne durumda kalıyor görürsün.[^2][^8][^1]

Dördüncü adımda maliyet bölümü ayrıntılanır: open/close komisyonu, saklama, SEC fee, spread ve istersen tahmini margin interest ayrı satırlar halinde akar.  Beşinci adımda sonuç ekranı yalnızca “kâr/zarar” vermez; “buying power”, “maintenance buffer”, “collateral utilization”, “estimated liquidation risk” ve “kaç gün dayanır” gibi broker mantığına daha yakın metrikler de verir.[^7][^4][^5][^6][^3][^1]

Bence en kritik yeni metrik “maintenance buffer” olmalı. Çünkü kullanıcıya sadece “margin call price” göstermek yetmez; asıl faydalı bilgi, “şu an buffer’ın kaç USD” ve “mevcut portföy yüzde kaç düşerse limit bozulur” sorularının cevabıdır.[^2][^1]

Önce portföy-teminat motorunu mu ekleyelim, yoksa maliyet motorunu mu derinleştirelim?

<div align="center">⁂</div>

[^1]: image.jpeg

[^2]: image.jpeg

[^3]: image.jpeg

[^4]: image.jpeg

[^5]: image.jpeg

[^6]: image.jpeg

[^7]: image.jpeg

[^8]: image.jpeg

