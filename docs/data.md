# Veri Kaynakları (Data)

Tüm hisse ve portföy verisi **JSON dosyalarında** tutulur. UI′da hiçbir hisse sabit kodlanmaz;
her liste bu dosyalardan türetilir. Böylece bir hisse eklemek/yormak için sadece JSON düzenlenir.

> Klasör: `src/lib/data/`

---

## `marketData.json` — Hisse Evreni (tek doğru kaynak)

Uygulamada *görüntülenebilir* tüm hisselerin kataloğu. Simülatör, senaryolar ve bulucu buradan
beslenir; portföy ekleme formunun ticker seçimi de buradan dolar.

### Şema (her kayıt)
| Alan | Tip | Açıklama |
|---|---|---|
| `company` | string | Şirket adı |
| `ticker` | string | Sembol (anahtar) |
| `exchange` | string | Borsa (NASDAQ / NYSE) |
| `currency` | string | Para birimi (USD) |
| `category` | string | Alt kategori (Foundry, Chip Design, Equipment …) |
| `price` | number | Güncel fiyat |
| `changePercent1D` | number | Günlük değişim % |
| `netChange` | number | Günlük net değişim ($) |
| `dayHigh` | number | Günlük yüksek |
| `dayLow` | number | Günlük düşük |

### Nasıl türetiliyor?
`engine/market.ts` bu JSON′ı okur ve:
- `getMarket(ticker)` ile tek kayıt döndürür,
- `marketUniverse()` ile bulucu için `Holding` şekline çevirir (`beta` haritadan, `sector`
  kategoriden, `collateral = 0.75`).

### Güncelleme
Yeni hisse eklemek için bu dosyaya bir nesne daha yazın — Simülatör/Senaryo/Bulucu select′leri
ve bulucu evreni **otomatik** güncellenir.

```json
{
  "company": "NVIDIA Corp.",
  "ticker": "NVDA",
  "exchange": "NASDAQ",
  "currency": "USD",
  "category": "Chip Design / GPU & AI",
  "price": 202.78,
  "changePercent1D": -0.66,
  "netChange": -1.34,
  "dayHigh": 204.58,
  "dayLow": 198.97
}
```

> **Not:** `beta` alanı JSON′da yoktur; `market.ts` içindeki `betaFor()` haritasından alınır.
> İleride JSON′a `beta` eklenirse `market.ts` güncellenerek oradan okunabilir.

---

## `defaultPortfolio.json` — Başlangıç Portföyü

Uygulama ilk açıldığında yüklenen örnek portföy (kullanıcının "Fill default portfolio" karşılığı).
Kullanıcı bunu düzenleyebilir, JSON′dan kendi portföyünü yükleyebilir veya sıfırlayabilir.

### Şema
```json
{
  "cash": 45.16,
  "account": { "initialMargin": 0.5, "maintenanceMargin": 0.25, "rate": 0.08 },
  "holdings": [
    {
      "ticker": "GFS", "name": "GlobalFoundries", "shares": 5,
      "price": 69.48, "cost": 69.48, "beta": 1.6,
      "collateral": 0.75, "sector": "Teknoloji"
    }
  ]
}
```

| Alan | Açıklama |
|---|---|
| `cash` | Nakit bakiyesi (USD) |
| `account.initialMargin` | Açılışta gerekli özkaynak oranı (Reg T %50) |
| `account.maintenanceMargin` | Sürdürme oranı (FINRA %25) |
| `account.rate` | Yıllık margin faiz oranı |
| `holdings[]` | Kullanıcının pozisyonları (`Holding` şeması) |

### Davranış
- `presets.ts` içindeki `DEFAULT_PORTFOLIO` buradan yüklenir.
- Kullanıcı düzenlemeleri `appState`′te tutulur ve URL hash′e yazılır; bu dosya *sabit şablon* olarak kalır.
- Portföydeki bir hisse `marketData.json`′da varsa, Portföy tablosunda **günlük değişim rozeti**
  (canlı `changePercent1D`) gösterilir.

---

## İlişkili Modüller
- Okuma: `engine/market.ts`, `engine/presets.ts`
- Yazma/Dışa aktarma: `engine/portfolioIO.ts` (`serializePortfolio`, `downloadPortfolio`)
- Doğrulama: `engine/portfolioIO.ts` (`parsePortfolio` — eksik alan için Türkçe hata)

---

## Yeni bir veri kaynağı eklemek isterseniz
1. `src/lib/data/` altına `.json` koyun.
2. Gerekirse `engine/`′de bir köprü modülü yazın (örn. `market.ts` gibi).
3. UI′da sabit liste yerine bu modülden türetilmiş değeri kullanın.
4. `tsconfig.json` zaten `resolveJsonModule: true` — JSON import′u tip güvenlidir.
