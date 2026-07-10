# Hesaplama Motoru (Engine)

Tüm finans mantığı bu klasörde, **saf TypeScript** olarak yaşar. Framework bağımlılığı yoktur;
bu yüzden kolayca birim test edilebilir ve UI′dan bağımsızdır.

> Dosya: `src/lib/engine/`

---

## `types.ts` — Tip Tanımları

Tüm modüllerin paylaştığı sözleşmeler. UI ve engine arasındaki tek ortak dil.

| Tip | Açıklama |
|---|---|
| `Holding` | Bir portföy pozisyonu: `ticker, name, shares, price, cost, beta, collateral, sector` |
| `AccountParams` | `initialMargin, maintenanceMargin, rate` (hesap kuralları) |
| `PortfolioData` | `cash + account + holdings[]` — state′in kalıcı şekli |
| `EnrichedHolding` | `Holding` + türetilen `value, weight, pl, plPct, collateralValue` |
| `PortfolioStats` | `portfolioStats()` çıktısı: toplamlar, sağlık, uyarılar |
| `HealthAlert` | `{ level, title, detail }` |
| `MarginResult` | `marginCalc()` çıktısı: call fiyatı, buffer, borç, alert |
| `CostBreakdown` | 6 maliyet bileşeni + toplam |
| `ScenarioInput` | `{ name, description, tradeShock, portfolioShock, dailyDrop, days }` |
| `ScenarioResult` | senaryo sonucu: yeni fiyat, cash/margin P/L, verdict |
| `ErosionPoint` | `{ day, equityRatio, marginCalled }` (timeline noktası) |
| `FinderConfig` | bulucu filtreleri: `budget, riskTolerance, goal, mode, scope, maxLot` |
| `FinderCandidate` | bir aday trade + skoru + gerekçe |
| `FinderMode` | `balanced \| safety \| upside` |
| `ScenarioScope` | `selected \| average \| worst` |

---

## `portfolio.ts` — Portföy İstatistikleri

**Amaç:** Portföyü bir *teminat motoru* olarak analiz etmek.

### `enrichHolding(h, totalInvested)`
Tek bir pozisyonu zenginleştirir: `value = shares×price`, `weight`, `pl`, `plPct`,
`collateralValue = value × collateral`.

### `portfolioStats(data: PortfolioData): PortfolioStats`
Ana fonksiyon. Şunları üretir:
- `totalInvested`, `cash`, `total`, `cashRatio`
- `collateralValue`, `availableCollateral = cash + Σ collateralValue`
- `buyingPower = availableCollateral / initialMargin`
- `weightedBeta` (sektör ağırlıklı)
- `largest`, `concentration` (en büyük pozisyon ağırlığı)
- `sectorWeights` (sektör → toplam ağırlık)
- `health` (0‑100 sağlık skoru) + `healthNarrative`
- `alerts` (sağlık uyarıları)

İç yardımcılar:
- `healthScore()` — nakit oranı, yoğunlaşma ve beta′ya göre ceza puanlı skor.
- `healthAlerts()` — eşiklere göre danger/warning/safe uyarıları.
- `topLevel()` — uyarı listesinden en yüksek seviyeyi döndürür.
- `accountDefaults()` — varsayılan hesap parametreleri.

**Planlandığı yer:** Dashboard KPI′ları, Portföy tablosu, Simülatör′ün teminat kontrolü,
Finder′ın açık‑olabilirlik filtresi.

---

## `margin.ts` — Margin Hesabı

**Amaç:** Tek bir trade′in margin açısından canlı analizi.

### `marginCalc({ price, shares, equity, account, availableCollateral }): MarginResult`
- `tradeValue = price × shares`
- `requiredEquity = tradeValue × initialMargin`
- `borrow = max(tradeValue − equity, 0)` (margin kredisi)
- `canOpen = availableCollateral >= requiredEquity` — **collateral‑aware** kontrol
- `callPrice = borrow / (shares × (1 − maintenanceMargin))`
- `bufferPct = (price − callPrice) / price × 100`
- `annualInterest = borrow × rate`
- `alert`: buffer ≤ 0 → `danger`, < 10 → `warning`, yoksa `safe`
- `rationale`: düz‑İngilizce/açıklama cümlesi (explanation‑first)

**Planlandığı yer:** Simülatör (anlık hesap + uyarı kutusu), Dashboard buffer KPI′sı.

---

## `costs.ts` — Maliyet Ayrıştırma

**Amaç:** Margin′in "sessiz yiyicisi"ni görünür kılmak (komisyon, spread, SEC, saklama, faiz).

### Sabitler
`COMMISSION_RATE = 0.0025`, `COMMISSION_MIN = 1.0`, `HALF_SPREAD = 0.005`,
`SEC_FEE_RATE = 0.0000206`, `CUSTODY_RATE = 0.0005`.

### `commission(notional)` — `max(notional×0.0025, 1)`
### `computeCosts({ shares, price, borrow, holdingDays, rate }): CostBreakdown`
- `openCommission`, `closeCommission` (her ikisi de komisyon)
- `spread = shares × 0.01`
- `secFee` (yalnızca satış)
- `custody = notional × 0.0005 × gün/365` (pro‑rate)
- `interest = borrow × rate × gün/365`
- `total`

`COST_LABELS` her bileşenin Türkçe etiketini tutar (UI′da gösterilir).

**Planlandığı yer:** Simülatör maliyet dökümü, Senaryolar (taşıma maliyeti), Finder (net P/L).

---

## `scenario.ts` — Senaryo Motoru

**Amaç:** Bir trade′i ve portföyü stres testine sokmak.

### `erosionTimeline({ price, shares, borrow, dailyDrop, days, maintenanceMargin })`
Günlük düşüş altında özkaynak oranının nasıl eridiğini hesaplar.
- Her gün `price ×= (1 + dailyDrop)`
- `equityRatio = (value − borrow) / value`
- `marginCalled = equityRatio < maintenanceMargin`
- `mcDay` = ilk margin call günü (bulunamazsa −1)

### `scenarioCalc({ price, shares, equity, account, scenario, holdingDays }): ScenarioResult`
- `newPrice = price × (1 + tradeShock)`
- `marginPL` = senaryo sonrası net kâr/zarar (maliyet düşülmüş)
- `cashShares = floor(equity / price)` — nakitle alınabilecek adet
- `cashPL` — nakit alternatifinin sonucu
- `newEquityRatio`, `verdict` (Kontrollü / Dikkat / Kırılgan)
- `multiplier = marginPL / cashPL` (kaldıraç etkisi)

**Planlandığı yer:** Simülatör (erozyon grafiği), Senaryolar (cash vs margin kıyasımı).

---

## `finder.ts` — En İyi Trade Bulucu

**Amaç:** Bütçe ve portföye göre en dayanıklı trade′i sıralamak.

### `runFinder(config, scenarios, activeScenarioName, ctx): { global, perStock }`
1. `marketUniverse()` üzerinden her hisse × lot (1..`maxLot`) adayı üretilir.
2. **Filtre:** `availableCollateral >= requiredEquity` ve `equity > 0` olanlar kalır.
3. Her aday için senaryo kapsamına göre (`selected` / `average` / `worst`) buffer ve net P/L
   toplanır.
4. **Skor** (read‑04′daki ağırlıklar):
   - `balanced`: Safety×1.15 + NetPnL×1.0 − Cost − MCDay×0.8 − SectorPenalty
   - `safety`: Safety×1.8 + NetPnL×0.35 − Cost − MCDay − SectorPenalty
   - `upside`: Safety×0.7 + NetPnL×1.6 − Cost×0.8 − MCDay×0.5 − SectorPenalty
5. **Best‑in‑scenario badge:** Her aday için en yüksek skoru veren senaryo bulunur.
6. `status`: en kötü senaryodaki buffer′a göre safe/warning/danger.
7. `rationale`: "Skor X — buffer %Y, çeşitlendirme, beta Z…" gibi açıklanabilir gerekçe.
8. `global` = ilk 3; `perStock` = hisse başına ilk 3.

`ctx = { availableCollateral, account, budget, sectorWeights }` portföyden gelir.

**Planlandığı yer:** Bulucu sayfası (Global Top 3 + Per‑Stock Top 3).

---

## `presets.ts` — Hazır Ayarlar

- `DEFAULT_PORTFOLIO` — `defaultPortfolio.json`′dan yüklenen başlangıç portföyü.
- `SCENARIOS` — 9 hazır stres senaryosu (Bull, Hype, Low Dip, Peak, Slow Bleed,
  Credit Stress, Tech Selloff, Recovery, Flat).
- `SECTORS` — sektör enum değerleri.

> Not: `FINDER_UNIVERSE` artık burada sabit değildir; `market.ts`′ten türetilir.

**Planlandığı yer:** Tüm sayfalar (senaryo kartları, varsayılan portföy).

---

## `market.ts` — Piyasa Verisi Köprüsü

**Amaç:** `marketData.json`′ı engine′in anladığı `Holding` şekline dönüştürmek. Tüm hisse
noktalarının tek kaynağı burasıdır.

- `MarketStock` — JSON şeması.
- `MARKET` — ham liste.
- `getMarket(ticker)` — tickera göre bul.
- `betaFor(ticker)` — JSON′da beta olmadığı için tickera göre makul varsayılan (harita).
- `sectorFor(category)` — kategori metninden `Sector` türetir (Internet → İletişim, diğer → Teknoloji).
- `marketUniverse()` — `UniverseStock[]` (shares=1, cost=price, collateral=0.75).

**Planlandığı yer:** Simülatör & Senaryolar ticker select′i, Bulucu evreni, Portföy ekleme formu.

---

## `concepts.ts` — Kavram Kılavuzu

Eğitim amaçlı kavram tanımları (initial margin, maintenance, call price, buffer, collateral,
concentration, carry, scenario). `CONCEPTS` dizisi ve `getConcept(key)`.

**Planlandığı yer:** ConceptModal (her sayfada açılabilir kavram notları).

---

## `portfolioIO.ts` — JSON Yükle / Dışa Aktar

**Amaç:** Portföyü modüler JSON olarak dışa/almak.

- `serializePortfolio(data)` — `PortfolioData` → biçimli JSON string.
- `parsePortfolio(text)` — JSON string → `PortfolioData` (**doğrulamalı**; eksik/hatalı alan için
  Türkçe hata fırlatır).
- `readPortfolioFile(file)` — `File` → `PortfolioData` (FileReader).
- `downloadPortfolio(data, filename)` — tarayıcıda indirme tetikler.

**Planlandığı yer:** Portföy sayfası ("JSON′dan yükle" / "JSON olarak dışa aktar").

---

## Modüller Arası Bağımlılıklar

```
types.ts  ──► (herkes kullanır)
portfolio.ts ──► types
margin.ts    ──► types
costs.ts     ──► types
scenario.ts  ──► types, costs
finder.ts    ──► types, market, costs, scenario
market.ts    ──► types, marketData.json
presets.ts   ──► types, defaultPortfolio.json
portfolioIO.ts ─► types, presets(SECTORS)
```

Hiçbir engine modülü `svelte`, `$app` veya DOM API′sini import etmez.
