# Finans Formülleri

Motorun kullandığı temel formüller. Kaynak: `read-04` (Deep Research Foundation) ve `read-05`
(MarginLab UI/UX spesifikasyonu) — her ikisi de ürün brief'leridir.

---

## Temel Margin

### Gerekli Özkaynak (Initial Margin)
```
requiredEquity = tradeValue × initialMargin
tradeValue     = price × shares
```
Reg T standart: `initialMargin = 0.50`.

### Margin Borcu
```
borrow = max(tradeValue − equity, 0)
equity = trade′i açmak için koyduğun kendi parası
```

### Call Fiyatı (Margin Call Price)
```
callPrice = borrow / (shares × (1 − maintenanceMargin))
```
Sürdürme sınırının kırıldığı hisse fiyatı.

### Buffer (Dayanıklılık Payı)
```
bufferPct = (price − callPrice) / price × 100
```
Pozitif → güvende; 0 → bugün çağrılırsın; negatif → zaten sorun.

### Açılabilirlik (collateral‑aware)
```
canOpen = availableCollateral ≥ requiredEquity
availableCollateral = cash + Σ(holding.value × holding.collateral)
```
Mevcut portföyün teminat katkısı + nakit, yeni trade′in gereken özkaynağını karşılamalı.

---

## Portföy

### Ağırlık / Değer
```
value      = shares × price
weight     = value / totalInvested
collateralValue = value × collateral
```

### Sağlık Skoru (basitleştirilmiş, read‑05)
```
Başlangıç 100
−18  nakit < %10
−24  yoğunlaşma > %40   (−14  eğer > %30)
−22  ağırlıklı beta > 1.6  (−12  eğer > 1.3)
```

### Ağırlıklı Beta
```
weightedBeta = Σ(weightᵢ × betaᵢ)
```

### Alım Gücü
```
buyingPower = availableCollateral / initialMargin
```

---

## Maliyet Ayrıştırma (6 bileşen)
```
openCommission = max(notional × 0.0025, 1.0)
closeCommission = openCommission
spread         = shares × 0.01            (tick 0.01, yarım spread 0.005)
secFee         = notional × 0.0000206     (yalnızca satış)
custody        = notional × 0.0005 × gün/365
interest       = borrow × rate × gün/365
total          = toplam
```
Toplam maliyet, trade′in kâr etmesi için gereken **minimum getiri eşiğidir**.

---

## Senaryo

### Senaryo Sonrası Değer
```
newPrice = price × (1 + tradeShock)
newValue = newPrice × shares
```

### Yeni Özkaynak Oranı
```
newEquityRatio = (newValue − borrow) / newValue
verdict: newEquityRatio < maintenanceMargin → Kırılgan
         buffer < %10 → Dikkat
         değilse → Kontrollü
```

### Cash vs Margin
```
cashShares = floor(equity / price)
cashPL  = (newPrice − price) × cashShares − cashCosts
marginPL = (newPrice − price) × shares − marginCosts
multiplier = marginPL / cashPL      (kaldıraç etkisi)
```

### Özkaynak Erozyonu (timeline)
```
her gün: price ×= (1 + dailyDrop)
equityRatio = (price×shares − borrow) / (price×shares)
marginCalled = equityRatio < maintenanceMargin
mcDay = ilk marginCalled günü
```

---

## Bulucu Skoru (read‑04)
```
Score(balanced) = Safety×1.15 + NetPnL×1.0 − Cost − MCDay×0.8 − SectorPenalty
Score(safety)   = Safety×1.80 + NetPnL×0.35 − Cost − MCDay − SectorPenalty
Score(upside)   = Safety×0.70 + NetPnL×1.60 − Cost×0.8 − MCDay×0.5 − SectorPenalty

Safety  = senaryo sonrası buffer%
NetPnL  = senaryo sonrası net kâr/zarar
Cost    = toplam maliyet
MCDay   = günlük düşüş altında margin call günü (penaltı: düşükse ceza)
SectorPenalty = portföydeki sektör ağırlığı × 70 (yoğunlaşma cezası)
```
Senaryo kapsamı: `selected` (sadece aktif), `average` (tüm senaryolar ortalaması),
`worst` (tüm senaryoların en kötüsü — broker stres testine en yakın).

---

## Kaynaklar
- Initial/Maintenance Margin, SMA: FINRA Margin Rule, Reg T (1934)
- Collateral haircut: regulatory haircut framework (FSB/SEC)
- Scenario / worst‑case: OCC margin methodology, CME risk engine
- Health score & concentration: read‑05 §2
- Finder skor ağırlıkları: read‑04 Algorithm Layer 2
