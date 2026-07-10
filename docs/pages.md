# Sayfalar (Pages / Routes)

Her sayfa bir **kullanıcı akışıdır**; engine + state + components′i birleştirir. Tüm metinler
Türkçe ve education‑focus′tur; rehber modu açıkken her sayfada `GuidedNote` görünür.

> Klasör: `src/routes/`

---

## Ortak Yapı
- `+layout.ts` — `ssr = false`, `prerender = false` (SPA).
- `+layout.svelte` — `IconSprite`, `Topbar`, `Sidebar`, `MobileDrawer`, `ConceptModal`;
  hash hidratasyonu + `$effect` ile hash senkronu.
- `+page.svelte` (Dashboard) ve `portfolio/`, `simulator/`, `scenarios/`, `finder/`,
  `education/` alt sayfaları.

---

## 1. Dashboard (`+page.svelte`)
**Hedef:** "Portföyüm şu an sağlıklı mı?"
- **Motor:** `portfolioStats(app.portfolio)`.
- **Bileşenler:** PageHeader, GuidedNote, hero panel + 3 `Metric`, 4 `KpiCard`, `WarningBox`
  (alerts), `BarChart` (sağlık profili), `Donut` (sektör dağılımı), `Badge`.
- **Çıktılar:** sağlık skoru, kullanılabilir teminat, alım gücü, yoğunlaşma, buffer, uyarılar.
- **Akış:** hero → metrikler → KPI → uyarı → grafikler.

---

## 2. Portföy (`portfolio/+page.svelte`)
**Hedef:** "Hangi pozisyonlarım var ve riskleri ne?"
- **Motor:** `portfolioStats`, `getMarket` (canlı değişim), `parsePortfolio`/`downloadPortfolio`.
- **Özellikler:**
  - Pozisyon tablosu (inline düzenleme: adet, fiyat, teminat %).
  - Ticker select′i `marketData.json`′dan (eklerken fiyat/şirket otomatik dolar).
  - Kataloğdaki hisseler için günlük değişim rozeti.
  - Hesap ayarları (nakit, initial/maintenance %, faiz).
  - **JSON modülü:** "JSON′dan yükle" (`readPortfolioFile`) / "JSON olarak dışa aktar"
    (`downloadPortfolio`); doğrulamalı.
  - Kavram kılavuzu (collateral, concentration, initial, maintenance).
- **Akış:** tablo → ekleme formu → hesap ayarları → kavramlar.

---

## 3. Simülatör (`simulator/+page.svelte`)
**Hedef:** "Bu trade′i margin ile alsam ne olur?"
- **Motor:** `portfolioStats` (teminat), `marginCalc`, `computeCosts`, `erosionTimeline`,
  `scenarioCalc`.
- **3 adımlı wizard:**
  1. Giriş: ticker (market select), fiyat, adet, özkaynak, margin/faiz kaydırıcıları.
  2. Anlık hesap: değer, borç, call fiyatı, buffer, faiz + `WarningBox` (buffer′a göre renk).
  3. Senaryo projeksiyonu: `LineChart` (özkaynak erozyonu) + senaryo seçici çipler.
- **Bulucu entegrasyonu:** "Trade'e yükle" (`setPendingTrade`) → Simülatör′de otomatik ön doldurulur.
- **Akış:** giriş → canlı sonuç → maliyet dökümü → erozyon grafiği.

---

## 4. Senaryolar (`scenarios/+page.svelte`)
**Hedef:** "Bu fırsatı farklı piyasa ortamlarında test edeyim."
- **Motor:** `scenarioCalc` (her senaryo için), `SCENARIOS`.
- **Özellikler:** test trade′i (ticker market′den), 9 senaryo kartı (aktif vurgulu), seçili
  senaryo için split panel (Nakit P/L | Margin P/L), kaldıraç badge′i, `BarChart` (cash vs margin).
- **Eğitsel vurgu:** "Flat" senaryosu — fiyat yerinde kalsa bile faiz kayıp üretir.
- **Akış:** trade seç → kartlar → detay paneli + kıyas grafiği.

---

## 5. Bulucu (`finder/+page.svelte`)
**Hedef:** "Bu bütçeyle portföyüme en çok katkıyı kim sağlar?"
- **Motor:** `runFinder` (marketUniverse üzerinden), `portfolioStats` (ctx).
- **Filtreler:** bütçe, risk toleransı, hedef, skor modu, senaryo kapsamı, max lot.
- **Çıktılar:**
  - **Global Top 3:** kart (ticker×lot, best‑in badge, durum badge, 4 KPI, gerekçe, detay).
  - **Per‑Stock Top 3:** akordeon bloklar (hisse başına lot sıralaması).
  - "Trade'e yükle" → Simülatör′e devir.
- **Akış:** filtreler → çalıştır → Global → Per‑Stock.

---

## 6. Eğitim (`education/+page.svelte`)
**Hedef:** "Bu kararlar neden böyle çalışıyor?"
- 5 adımlı öğrenme akışı (portföy fotoğrafı → risk → margin kurulumu → senaryo → alternatif arama).
- 5 uyarı akışı (`WarningBox`): dar buffer, yoğun pozisyon, faiz baskısı, mobil okunabilirlik,
  ikon+metin.
- Her adımda "İlgili kavram" butonu → `openConcept`.

---

## Sayfa → Modül Haritası

| Sayfa | Kullandığı engine | Kullandığı state |
|---|---|---|
| Dashboard | portfolio | app.portfolio |
| Portföy | portfolio, market, portfolioIO | app.portfolio, app.guided |
| Simülatör | portfolio, margin, costs, scenario, market | app.portfolio, app.pendingTrade |
| Senaryolar | scenario, market | app.portfolio, app.activeScenario |
| Bulucu | finder, market, portfolio | app.portfolio, app.finder, app.pendingTrade |
| Eğitim | concepts | conceptStore, app.guided |

---

## Progressive Disclosure (kademeli yüzey)
1. **Karar yüzeyi:** Ana KPI, açılabilir mi?, buffer, P/L — %80 kullanıcı bunu görür.
2. **Anlama yüzeyi:** maliyet dökümü, senaryo detayı, MC günü — bir tıklama ile.
3. **Uzman yüzeyi:** senaryo seçici, detaylı parametreler — varsayılan gizli.
