# Mimari (Architecture)

MarginLab, **katmanlı** bir yapıya sahiptir. Her katman yalnızca altındaki katmanı bilir; böylece
hesaplama mantığı UI′dan tamamen ayrışır ve birim test edilebilir kalır.

```
┌──────────────────────────────────────────────────────────────┐
│  ROUTES (Sayfalar)  — src/routes/*                              │
│  Kullanıcı akışları; engine + state + components birleştirilir  │
└───────────────────────────┬──────────────────────────────────┘
                            │ kullanır
┌───────────────────────────┴──────────────────────────────────┐
│  COMPONENTS (UI)  — lib/components/*                           │
│  Layout, ui primitives, charts, icons (sunum katmanı)          │
└───────────────────────────┬──────────────────────────────────┘
                            │ okur / yazar
┌───────────────────────────┴──────────────────────────────────┐
│  STATE  — lib/state/*                                        │
│  appState ($state), conceptStore, URL hash senkronu, tema      │
└───────────────────────────┬──────────────────────────────────┘
                            │ besler
┌───────────────────────────┴──────────────────────────────────┐
│  ENGINE  — lib/engine/*  (saf TypeScript, framework‑bağımsız)  │
│  portfolio · margin · costs · scenario · finder · market       │
└───────────────────────────┬──────────────────────────────────┘
                            │ okur
┌───────────────────────────┴──────────────────────────────────┐
│  DATA  — lib/data/*.json                                      │
│  marketData.json (hisse evreni) · defaultPortfolio.json        │
└──────────────────────────────────────────────────────────────┘
```

---

## Katman Sorumlulukları

### 1. Data (JSON)
Uygulamanın tek doğru kaynağı. `marketData.json` tüm işlem görebilir hisseleri; `defaultPortfolio.json`
başlangıç portföyünü tanımlar. Hiçbir UI bu değerleri sabit kodlamaz — hepsi JSON′dan türetilir.

### 2. Engine (saf TS)
Finans matematiği burada yaşar. DOM, Svelte veya başka framework bağımlılığı **yoktur**.
Bu sayede:
- Her fonksiyon bağımsız test edilebilir.
- UI değişse bile mantık korunur.
- Hesaplama "kurumsal" kalırken arayüz "sade" olabilir.

### 3. State (reaktif durum)
Svelte 5 runes (`$state`, `$derived`, `$effect`) ile merkezi durum. URL hash senkronu sayesinde
uygulama durumu adres çubuğunda taşınır; `localStorage` yalnızca tema için kullanılır
(read‑05′in "localStorage çökmesin" kuralı).

### 4. Components (sunum)
Durumu görselleştirir, kullanıcı girişini toplar. Hiçbir hesaplama burada yapılmaz — hepsi
engine′e delege edilir.

### 5. Routes (sayfalar)
Akışları düzenler: hangi engine fonksiyonunun hangi state ile çalıştırılacağı ve sonucun hangi
bileşenle gösterileceği burada tanımlanır.

---

## Tipik Bir Hesaplama Akışı (örnek: Simülatör)

```
Kullanıcı fiyat/adet girer
   │  (oninput)
   ▼
appState.app.portfolio  ──►  portfolioStats()  ──►  availableCollateral
   │                                                  │
   ▼                                                  ▼
marginCalc({ price, shares, equity, account, availableCollateral })
   │
   ▼
Scenario (erozyon timeline) + costs (maliyet dökümü)
   │
   ▼
Sayfa: KPI′lar + WarningBox + LineChart (metin her zaman grafikten önce render edilir)
```

---

## Reaktif Zincir

- `app.portfolio` değiştiğinde → tüm `$derived(portfolioStats(app.portfolio))` tarayıcıları
  otomatik yeniden hesaplanır.
- `$effect` (layout içinde) state değişimini URL hash′e yazar (`syncHash`).
- `hydrateFromHash()` sayfa açılışında hash′i okuyup state′i geri yükler.

---

## Neden SPA / adapter-static?

Ürün gerçek zamanlı piyasa verisine bağlı değildir (V1 kapsamı dışı). Tüm veri ya JSON′da ya
kullanıcı girişinde. Bu yüzden sunucuya ihtiyaç yok; statik bir SPA yeterli ve dağıtımı basittir.
SSR kapatıldı (`+layout.ts`: `ssr = false`) çünkü durum tamamen istemci tarafında.

---

## Hata Toleransı

- Grafikler SVG ile yazıldığı için CDN/bağımlılık çökse bile sayılar görünür.
- Engine saf fonksiyon olduğundan bir sayfadaki hata diğer hesaplamaları etkilemez.
- Tüm sayısal çıkışlar `fmt*` yardımcıları ile Türkiye yerel ayarıyla biçimlenir.
