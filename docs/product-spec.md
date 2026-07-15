# MarginLab — Tam Ürün & UI/UX Spesifikasyonu
> **Durum:** v0.3 Tasarım Spesifikasyonu — Mevcut HTML analizi, araştırma raporu ve UX ilkeleri birleştirilerek hazırlanmıştır.  
> **Tarih:** 9 Temmuz 2026  
> **Dosya kaynakları:** `marginlab.html` (kod analizi), sohbet araştırma raporu, fintech UX araştırması[^1][^2][^3]

***
## BÖLÜM 1 — Ürün Kimliği ve Vizyonu
### Bu ürün ne yapar?
MarginLab bir hesap makinesi değildir. **Portfolio-backed stock ve margin karar stüdyosu**dur. Kullanıcıya şu soruların cevabını verir:

- Portföyüm şu an ne kadar sağlıklı?
- Margin ile şu hisseyi alsam ne olur?
- Hangi senaryo beni margin call'a iter?
- Bu bütçeyle portföyüme en çok katkı veren trade hangisi?

Bunu yaparken **önce açıklar, sonra hesaplar** — çünkü hedef kullanıcı sayıyı okumakla yetinmez, mantığı da öğrenmek ister.[^3]
### Ürün kategorisi
Fintech UX araştırmalarında bu ürün "educational trading simulator" ve "margin risk engine" kesişiminde yer alır. Mevcut rakip piyasada bu ikisi ayrı kategorilerde var — bu ürün birleştiriyor.[^2][^4]
### Ne yapmıyor (bilinçli karar)
Aşağıdaki özellikler araştırmada bilinçli olarak V1 dışında bırakıldı:

| Özellik | Neden ertelendi |
|---|---|
| VaR (Value at Risk) | Çok karmaşık, beginner için anlamsız |
| Options margin | Farklı hesaplama mantığı gerektirir |
| Gerçek zamanlı fiyat API | MVP kapsamı dışı |
| Multi-account yönetimi | V2'ye bırakıldı |
| Sosyal/paylaşım özellikleri | Önce solo karar akışı olgunlaşmalı |

***
## BÖLÜM 2 — Alan Haritası (Domain Map)
### Zorunlu kavramlar (MVP çekirdeği)
| Kavram | Tanım | Ürün içi kullanım |
|---|---|---|
| **Initial Margin** | Pozisyon açarken gereken minimum özkaynak oranı (ABD'de Reg T ile %50) | Simülatör girişi |
| **Maintenance Margin** | Pozisyon açıkken korunması gereken minimum oran (genelde %25) | Margin call hesabı |
| **Margin Call Price** | Maintenance margin tetiklenen fiyat seviyesi | Simülatör çıktısı |
| **Buffer Distance** | Mevcut fiyat ile margin call fiyatı arasındaki mesafe | Dashboard güvenlik göstergesi |
| **Carrying Cost** | Margin borcunun yıllık faiz maliyeti | Senaryo analizinde "sessiz yiyici" |
| **Collateral** | Portföydeki mevcut varlıkların margin hesabı için katkısı | Portfolio awareness |
| **Concentration Risk** | Tek hissenin portföydeki aşırı ağırlığı | Sağlık skoru hesabı |
| **Equity Erosion** | Düşüş sırasında özkaynak oranının erimesi | Senaryo grafiği |
### Güçlendirici kavramlar (V2)
- Collateral haircut (broker bazlı indirim oranları)
- House margin rules (bireysel broker kuralları)
- Concentration adjustment
- SMA (Special Memorandum Account) bakiyesi
- Rebalancing trigger logic
### Formüller
**Margin Call Price:**

\[ P_{call} = \frac{Borrow}{Shares \times (1 - MaintenanceMargin)} \]

**Buffer Distance:**

\[ Buffer\% = \frac{P_{current} - P_{call}}{P_{current}} \times 100 \]

**Annual Carrying Cost:**

\[ Interest = Borrow \times Rate_{annual} \]

**Equity Ratio at price P:**

\[ EquityRatio = \frac{P \times Shares - Borrow}{P \times Shares} \]

**Portfolio Health Score (basitleştirilmiş):**

Başlangıç: 100 puan  
- Nakit < %10 → -18  
- Konsantrasyon > %40 → -24, > %30 → -14  
- Ağırlıklı beta > 1.6 → -22, > 1.3 → -12  
- Aralık:[^5][^6]

***
## BÖLÜM 3 — Rakip Patern Analizi
### 5 çözüm paterni (marka değil, iş mantığı)
| Patern | Örnek | Ne çözer | Nerede başarısız | Aktarılabilecek |
|---|---|---|---|---|
| **Watchlist tracker** | Simply Wall St | Portföy görünürlüğü | Risk mantığı yok | Vizual health indicators |
| **Auto-rebalancing** | M1 Finance | Otomatik dağılım | Eğitim yok, neden açıklanmıyor | Dağılım chart mantığı |
| **Broker margin calc** | IBKR, TD | Doğru hesap | UI berbat, bağlam yok | Formül katmanı |
| **Paper trading** | thinkorswim | Gerçek piyasa ortamı | Beginner için ezici | Senaryo-based test mantığı |
| **Institutional risk** | Bloomberg, FactSet | Derinlik | Fiyat ve karmaşıklık | Stress test dili |
### En kritik boşluk
"Explanation-first" yaklaşım hiçbir araçta dominant değil. Broker calculators doğru hesaplar ama neden sorusunu hiç yanıtlamaz. Educational tools kavramları anlatır ama hesaplamaz. MarginLab ikisini birleştirmeli.[^2][^7]

***
## BÖLÜM 4 — Algoritma Mimarisi
### 4 katmanlı algoritma planı
#### Katman 1 — Foundation (MVP zorunlu)

```
portfolioStats()
  → toplam değer, nakit oranı, ağırlıklı beta
  → en büyük pozisyon ve ağırlığı
  → health score

marginCalc()
  → position value, borrow, call price, buffer, annual interest
  → alert level (safe / warning / danger)
```

#### Katman 2 — Best Finder (MVP ikincil)

```
runFinder(budget, riskTolerance, mode)
  → FILTER: budget >= price
  → SCORE:
     affordability   × 0.35
     diversification × 1.50  (mevcut portföyle örtüşme ters orantılı)
     beta penalty    (risk toleransına göre)
     concentration penalty (aynı sektör/hisse ise -28)
  → MODE bonus: safest → düşük beta bonus, return → yüksek beta bonus
  → SORT: score desc
  → EXPLAIN: her satıra gerekçe koy
```

#### Katman 3 — Scenario Engine (MVP üçüncü)

```
scenarioCalc(scenario_move_pct)
  → new price, new value, new equity ratio
  → cash P/L vs margin P/L
  → verdict: Kontrollü / Dikkat / Kırılgan
  → equity erosion timeline (daily -5% projection)
```

#### Katman 4 — Rebalance & MCR (V2+)

- Concentration adjustment önerileri
- SMA bakiye takibi
- Liquidation ladder simülasyonu
### Explainable scoring ilkesi
Her sayının yanında neden o sayı sorusu cevaplandırılmalı. "Skor: 73" değil, "Skor: 73 — düşük beta (+12), iyi çeşitlendirme (+20), bütçe yetersiz (-15)" formatında.[^2][^4]

***
## BÖLÜM 5 — Mevcut HTML Kod Analizi
### Yapısal envanter
| Katman | İçerik |
|---|---|
| **Sayfalar** | dashboard, portfolio, simulator, scenarios, finder, education |
| **Paneller** | 15 panel başlığı (tablo, simülatör, finder, eğitim dahil) |
| **Grafikler** | healthChart (bar), allocationChart (doughnut), erosionChart (line), scenarioChart (bar) |
| **Fonksiyonlar** | 28 JS fonksiyonu (veri, render, routing, event, utils, orchestration) |
| **CSS tokens** | 63 custom property (light + dark mode) |
| **Responsive** | 3 breakpoint: 1180px, 960px, 640px |
| **Formlar** | 13 input, 12 button |
| **Navigasyon** | 6 nav item, desktop sidebar + mobile drawer |
| **Veri** | 4 portföy pozisyonu, 8 finder evreni, 6 senaryo |
| **Kavramlar** | 5 tanımlı kavram (modal ile açılır) |
### İkon listesi (17 adet)
```
book-marked, filter, info, lightbulb, moon-star, panel-left-open,
pie-chart, play, plus, scan-search, shield-alert, shield-check,
sigma, triangle-alert, wallet, workflow, x
```
### Fonksiyon kategorileri
| Kategori | Fonksiyonlar |
|---|---|
| Data/Calc | `portfolioStats`, `marginCalc`, `getHealthNarrative` |
| Render (text) | `renderNav`, `renderPortfolio`, `renderSimulator`, `renderScenarios`, `renderEducation`, `runFinder` |
| Render (charts) | `renderDashboard` ← **sorun burada** |
| Routing | `activatePage`, `attachNavHandlers` |
| UI Events | `openDrawer`, `closeDrawer`, `openConcept`, `closeConcept`, `bind`, `addAsset` |
| Utils | `fmtMoney`, `fmtPct`, `clamp`, `qs`, `destroyCharts`, `chart*Color` |
| Orchestration | `rerender` |

***
## BÖLÜM 6 — Teşhis Raporu (v0.2 Hataları)
### Kök Neden: CDN Race Condition
```
PROBLEM MİMARİSİ:

<script defer src="cdn.jsdelivr.net/chart.js">  ← async indir, önce çalıştır
<script defer src="unpkg.com/lucide@latest">     ← async indir, önce çalıştır
<script>                                          ← inline, hemen parse et
  window.addEventListener('DOMContentLoaded', ()=>{
    rerender();  ← Chart ve lucide mevcut olmayabilir!
  });
</script>
```

`defer` etiketli scriptler `DOMContentLoaded`'dan önce çalışır — ama CDN yavaş veya engelliyse bu sıra bozulur. `Chart is not defined` hatası `rerender()`'ı çökertir, tüm init zinciri ölür.
### İkincil hatalar
| Hata | Etki | Çözüm |
|---|---|---|
| `rerender()` içinde 7 fonksiyon arka arkaya | İlki çökerse diğerleri çalışmaz | Her fonksiyon `try/catch` içinde izole edilmeli |
| Grafik önce, metin sonra | Chart hatasında KPI'lar da boş kalır | `renderText()` → `renderCharts()` sırası zorunlu |
| 0 try/catch bloku tüm JS'de | Tek hata tüm uygulamayı öldürür | Her render fonksiyonuna hata izolasyonu |
| `window.lucide` guard var ama yetersiz | `requestAnimationFrame` de geç kalabilir | Lucide inline SVG sprite ile bağımlılık kaldırılmalı |
| Mobile nav `display:none` ama JS handler eksikti | Menü açılmıyordu | Handler binding sırası düzeltilmeli |

***
## BÖLÜM 7 — UI/UX Tasarım Sistemi
### Renk tokenleri (Nexus Palette)
**Light mode:**

| Token | Değer | Kullanım |
|---|---|---|
| `--bg` | `#f7f6f2` | Ana sayfa arka planı |
| `--surface` | `#f9f8f5` | Panel yüzeyi |
| `--surface-2` | `#fbfbf9` | İç bileşen yüzeyi |
| `--surface-3` | `#f0ede8` | Hover yüzeyi |
| `--border` | `#d8d3cc` | Tüm kenar çizgileri |
| `--text` | `#1f1c17` | Ana metin |
| `--muted` | `#6e685f` | İkincil metin |
| `--faint` | `#aaa39a` | Üçüncül metin |
| `--success` | `#2f6b3b` | Pozitif durum |
| `--warning` | `#9a5b13` | Dikkat durumu |
| `--danger` | `#8e2437` | Tehlike / margin call |

**Dark mode:** Tüm tokenlar `[data-theme="dark"]` altında override edilir. Teal primary yerine nötr metin rengi kullanılır — editorial monochrome yaklaşım.
### Tipografi
- **Display:** DM Serif Display (İtalik başlıklar, hero H1, modal başlıkları)
- **Body:** DM Sans (Tüm UI metni, etiketler, sayılar)
- **Sayısal:** `font-variant-numeric: tabular-nums` — para değerleri hizalı görünür
### Boşluk sistemi (4px grid)
```
--space-1: 4px    (ikon aralığı, badge iç)
--space-2: 8px    (satır arası)
--space-3: 12px   (kompakt padding)
--space-4: 16px   (standart padding)
--space-6: 24px   (kart padding)
--space-8: 32px   (bölüm başı boşluk)
--space-10: 40px  (major section gap)
--space-16: 64px  (sayfa üst boşluk)
```
### Responsive grid
```
Desktop 1440px: sidebar (280px) + main (1fr)
Tablet 1180px:  sidebar kaybolur, single column grid
Mobile 960px:   hamburger menü, tek kolon, yığılmış kartlar
Small 640px:    tablo → card list, hero küçülür
```

***
## BÖLÜM 8 — Bileşen Katalogu
### Layout bileşenleri
#### Topbar

```
[280px] [BrandMark] [BrandText: MarginLab | subtitle]   [ThemeToggle]
                    ← brand region →                     ← actions →

Mobile:
[MenuBtn] [BrandMark] [BrandText]                        [ThemeToggle]
```

- Height: `72px` (`--top-h`)
- Sticky, `backdrop-filter: blur(14px)`, `z-index: 60`
- Hover: `translateY(-1px)` + surface-3 background
- Transition: `180ms cubic-bezier(0.16,1,0.3,1)`

#### Sidebar

```
┌─ 280px wide, sticky top:72px ──────────────────┐
│  [NAV GROUP TITLE: "Çalışma Alanı"]             │
│                                                  │
│  [nav-link.active]  ← dashboard icon  Genel Bakış│
│  [nav-link]          portfolio icon   Portföy   │
│  [nav-link]          calculator icon  Simulator │
│  [nav-link]          waypoints icon   Senaryolar│
│  [nav-link]          scan-search icon Bulucu    │
│  [nav-link]          book icon        Eğitim    │
│                                                  │
│  ┌─ sidebar-card ─────────────────────────────┐ │
│  │  Bu ürün ne yapar?                          │ │
│  │  Kısa açıklama metni...                     │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- Nav link hover: `background: surface-2`, `border: 1px solid border`, `color: text`
- Nav link active: `background: text` (koyu), `color: inverse` (açık)
- Transition: `all 180ms ease`

#### Mobile Drawer

```
KAPALI: transform: translateX(-100%)
AÇIK:   transform: translateX(0)
Backdrop: opacity 0 → 1

[X butonu]  MarginLab / Gezinme
─────────────────────────────────
[Nav items — aynı desktop nav]
```

- Width: `min(86vw, 360px)`
- z-index: 80 (drawer), 75 (backdrop)
- Transition: `0.20s ease`
- ESC tuşu veya backdrop click ile kapanır
### Kart/Panel bileşenleri
#### Hero Panel

```
┌──────────────────────────────────────┐
│  EYEBROW: "Executive view"           │
│                                      │
│  H1: Portföy, margin ve              │
│  senaryo mantığını tek               │
│  karar akışında birleştir.           │
│                                      │
│  P: Açıklama metni (max 64ch)        │
│                                      │
│  [▶ Margin simülasyonuna git]  [Finder]│
└──────────────────────────────────────┘
```

- Padding: `--space-8` (32px)
- Min-height: `320px`
- Border-radius: `--radius-xl` (32px)
- H1: `DM Serif Display`, `clamp(34px, 5vw, 54px)`

#### KPI Kartı

```
┌──────────────────────────────┐
│  Portföy Sağlık Skoru        │ ← .label (13px, --muted)
│                              │
│  87/100                      │ ← .value (30px, bold, tabular)
│                              │
│  Beta 1.12 · nakit %14       │ ← .hint (13px, --muted)
└──────────────────────────────┘
```

- Grid: 4 kolon (tablet: 2 kolon, mobile: 1 kolon)
- Padding: `18px`
- Border-radius: `20px`
- Border: `1px solid --border`

#### Metric (Hero yan panel)

```
┌─────────────────────────────────────┐
│  Toplam portföy          [wallet]   │ ← .metric-top
│  $1,351                             │ ← .metric-value (28px bold)
│  3 hisse · 17% nakit                │ ← .metric-sub (13px muted)
└─────────────────────────────────────┘
```

#### Badge sistemi

```
[● Dengeli]   → badge-success (yeşil bg + border)
[● Dikkat]    → badge-warning (turuncu bg + border)
[● Yoğun]     → badge-danger  (kırmızı bg + border)
[● Nötr]      → badge-neutral (gri bg + border)
```

- Height: `~34px`, padding: `8px 12px`
- Border-radius: `999px` (pill)
- Font: `13px bold`

#### Warning Box

```
[icon]  BAŞLIK (bold)
        Açıklama metni (13px muted)
```

Üç seviye:
- `.success`: yeşil bg, `shield-check` ikonu
- `.warning`: turuncu bg, `triangle-alert` ikonu
- `.danger`: kırmızı bg, `info` veya özel ikon
### Form bileşenleri
#### Input

```
[label text]        ← 13px, --muted, font-weight: 600
[─────────────────] ← input, 46px height, 14px padding, radius-md
```

- Focus: `outline: 2px solid --text`, `outline-offset: 3px`
- Border: `1px solid --border`
- Background: `--surface-2`

#### Range Slider (Margin ayarları için)

```
Initial margin %  [^50]      ← label + dinamik değer
[══════════●═══════════]    ← input[type=range]
```

- `accent-color: var(--text)`
- Label içinde span ile dinamik değer güncellenir

#### Button hiyerarşisi

```
[▶ Primary CTA]      → bg: --text, color: --inverse, border: --text
[◌ Secondary]        → bg: --surface-2, border: --border
[Ghost]              → bg: transparent
```

- Min-height: `46px`, padding: `0 18px`
- Border-radius: `14px`
- Hover: `translateY(-1px)`
- Active: `translateY(0)`
- İkon + metin: gap `10px`, ikon `18px × 18px`
### Tablo bileşeni
```
BAŞLIK ROW (desktop):
Varlık | Adet | Fiyat | Değer | Ağırlık | P/L | Risk etiketi

VERI ROW:
[● NVDA]  3  $196  $588  43.5%  +$162  [Yoğun]

Mobile card mode (640px altı):
[Varlık]    data-label ile kart görünümü
  NVDA
[Fiyat]
  $196
...
```

- `thead th`: `12px uppercase tracked --faint`
- `tbody td`: `padding: 16px 0`, `border-top: 1px solid --border`
- Mobile: `display: block`, `data-label` attr ile etiket
### Grafik sarmalayıcı
```
.canvas-wrap { position: relative; min-height: 280px }
.canvas-wrap.tall { min-height: 360px }
canvas { width: 100% !important; height: 100% !important }
```

**Grafik tema ayarları:**
- `textColor`: `getComputedStyle → --muted`
- `gridColor`: `getComputedStyle → --border`
- `mainColor`: `getComputedStyle → --text`
- Dark mode geçişinde chart'lar destroy/recreate edilir
### Modal bileşeni
```
[backdrop: rgba overlay]
┌─ modal-card (max 760px) ──────────────────────┐
│ ┌─ modal-head ──────────────────────────────┐ │
│ │  EYEBROW: "Concept note"    [X butonu]    │ │
│ │  H3: Initial Margin                       │ │
│ └───────────────────────────────────────────┘ │
│ ┌─ modal-body ──────────────────────────────┐ │
│ │  Açıklama paragrafı                       │ │
│ │  ┌─ warning-box ────────────────────────┐ │ │
│ │  │  [lightbulb]  Üründe kullanım örneği │ │ │
│ │  └──────────────────────────────────────┘ │ │
│ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

- Border-radius: `28px`
- `max-height: 90vh`, `overflow: auto`
- ESC veya backdrop click kapatır

***
## BÖLÜM 9 — Sayfa Bazlı UX Akışları
### Sayfa 1: Genel Bakış (Dashboard)
**Kullanıcı hedefi:** "Portföyüm şu an sağlıklı mı?"

```
AKIŞ:
1. Sayfa açıldığında → hero panel ilk görünür (portfolio context)
2. Sağ tarafta 3 metric → toplam değer, margin buffer, konsantrasyon
3. Altında 4 KPI → health score, cash ratio, risk level, en büyük pozisyon
4. Warning banner → sağlık durumu tek cümleyle özetlenir
5. Badge bandı → 4 badge ile hızlı sinyal
6. Bar grafik → 4 boyutlu sağlık profili
7. Doughnut grafik → portföy dağılımı (allocation)

PROGRESSIVE DISCLOSURE:
- İlk 3 saniye: headline rakamlar okunur
- Sonra: uyarı durumu fark edilir
- Sonra: grafiklere bakılır
- CTA butonları → ilgili modüle yönlendirir
```

**Bileşen sıralaması (yukarıdan aşağı):**
1. Hero 2-kolon grid (hero-panel + hero-side)
2. 4-kolon KPI grid
3. 7+5 grid (sağlık paneli + dağılım paneli)
### Sayfa 2: Portföy
**Kullanıcı hedefi:** "Hangi pozisyonlarım var ve riskleri ne?"

```
AKIŞ:
1. Tablo → tüm pozisyonlar risk etiketiyle
2. Sağ kolon → kavram kılavuzu (her kavrama tıklanınca modal açılır)
3. Alt kısım → pozisyon ekleme formu (7 form alanı)
4. Ekle butonu → portföye ekler, tablo anında güncellenir

UYARI AKIŞI:
- Yeni eklenen pozisyon %40 üstünde ağırlıkta olursa → badge "Yoğun"
- Kullanıcı bağlamı kaybetmez (modal değil, inline ekleme)
```
### Sayfa 3: Margin Simülatörü
**Kullanıcı hedefi:** "Bu trade'i margin ile alsam ne olur?"

```
AKIŞ — 3 adımlı wizard mantığı, tek sayfada:

ADIM 1 — Pozisyon girişi (sol panel):
  Ticker, fiyat, adet, özsermaye
  Initial margin %, Maintenance %, Borrow rate

ADIM 2 — Anlık hesap (sağ panel, otomatik güncellenir):
  Pozisyon değeri, borç, call fiyatı, yıllık faiz
  Warning box → buffer durumuna göre renk değişir

ADIM 3 — Senaryo projeksiyonu (alt panel, tam genişlik):
  Günlük -%5 düşüş halinde equity erozyon grafiği
  X ekseni: "Gün 0" → "Gün 12"
  Y ekseni: Equity ratio %

SLIDER AKIŞI:
  Input değişince → anlık render (oninput)
  "Simülasyonu çalıştır" → tam rerender + chart destroy/recreate
```

**Kritik UX kuralı:** Sayılar her zaman text'te önce görünür. Chart yüklenmese bile rakamlar okunur halde kalır.
### Sayfa 4: Senaryolar
**Kullanıcı hedefi:** "Bu fırsatı farklı piyasa ortamlarında test edeyim."

```
AKIŞ:
1. 6 senaryo kartı (3+3 grid)
   [Bull +30%] [Up +15%] [Flat 0%]
   [Bear -20%] [Shock -35%] [Crash -50%]

2. Karta tıklanınca:
   - Aktif kart highlight (border-color: --text)
   - Alt paneller güncellenir

3. Split panel:
   Cash P/L | Margin P/L | Yeni equity oranı | Karar okuması

4. Bar chart:
   Cash vs Margin karşılaştırması, yan yana

ÖĞRETICI MANTIK:
  Flat senaryo özellikle önemli: "Fiyat yatay bile olsa
  faiz taşıma maliyeti kayıp yaratır" — bu fark visible olmalı
```
### Sayfa 5: Trade Bulucu
**Kullanıcı hedefi:** "Bu bütçeyle portföyüme en iyi katkıyı kim sağlar?"

```
AKIŞ:
1. Sol panel → 3 filtre:
   Bütçe (sayısal input)
   Risk toleransı (Low / Medium / High)
   Karar hedefi (Portföy uyumu / En güvenli / Getiri odaklı)

2. "Bulucu çalıştır" butonu → skor hesapla

3. Sağ panel → sıralı tablo:
   Hisse | Fiyat | Portföy uyumu skoru | Risk etiketi | Gerekçe

EXPLAINABLE SCORING:
  "En iyi aday." kısa gerekçe satırı
  Skor: sayısal değer (73 gibi)
  Gerekçe: "Dağılıma katkı veriyor" / "Mevcut yoğunluğu artırıyor"
  İlk sıra bold vurgu
```

**Algoritma görünürlüğü:** Kullanıcı neyin puanlandığını anlayabilmeli — black-box değil.[^2]
### Sayfa 6: Eğitim Akışı
**Kullanıcı hedefi:** "Bu kararlar neden bu şekilde çalışıyor?"

```
AKIŞ:
Sol panel — 5 adımlı öğrenme akışı:
  1. Portföy fotoğrafı
  2. Risk açıklaması
  3. Margin kurulumu
  4. Senaryo baskısı
  5. Alternatif arama

Sağ panel — 5 uyarı akışı:
  Dar buffer → seçenekler sun
  Yoğun pozisyon → görünür kıl
  Faiz baskısı → sessiz maliyeti göster
  Mobil okunabilirlik → aksiyonlar üstte
  İkon + metin → asla ikon yalnız
```

***
## BÖLÜM 10 — Yeni Versiyon İnşa Planı
### P0 — Kritik (önce bunlar)
**1. İkonları CDN'den kaldır, inline SVG sprite yap**

```html
<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
  <symbol id="ic-dashboard" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <!-- SVG path burada -->
  </symbol>
  <!-- 17 ikon × symbol -->
</svg>

<!-- Kullanım: -->
<svg class="icon" aria-hidden="true" width="18" height="18">
  <use href="#ic-dashboard"/>
</svg>
```

Avantajlar: CDN bağımlılığı yok, `currentColor` ile tema geçişi çalışır, `aria-hidden` ile erişilebilirlik korunur.

**2. Script yükleme sırası — güvenli mimari**

```html
<!-- Scriptleri defer DEĞİL, </body> öncesinde yükle -->
<script src="cdn.jsdelivr.net/chart.js"></script>  <!-- senkron yükle -->
<script>
  // Tüm uygulama kodu burada
  function initApp() {
    renderTextData();   // Chart bağımlılığı yok — her zaman çalışır
    renderCharts();     // try/catch ile izole
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
</script>
```

**3. Render sıralaması — text önce, grafik sonra**

```javascript
function rerender() {
  // ADIM 1: Metin verileri — CDN'den bağımsız, her zaman çalışır
  renderTextData();     // KPI'lar, tablo, metrikler, uyarılar

  // ADIM 2: Grafikler — izole, hata varsa sadece bu bölüm etkilenir
  try {
    destroyCharts();
    renderCharts();
  } catch(e) {
    console.warn('Chart render failed:', e);
    showChartFallback(); // CSS bar göster
  }

  // ADIM 3: Navigasyon ve routing
  renderNav();
  attachNavHandlers();
}
```

**4. Her render fonksiyonu izole**

```javascript
function renderDashboard() {
  try {
    // Health bar chart
    state.charts.health = new Chart(/* ... */);
  } catch(e) {
    console.warn('healthChart failed', e);
    // Fallback: CSS progress bar
    qs('healthChart').parentElement.innerHTML = `
      <div class="chart-fallback">
        <div style="height:8px;background:var(--text);width:${stats.health}%;
             border-radius:4px;transition:width .3s"></div>
      </div>`;
  }
}
```
### P1 — Önemli (ikinci geçiş)
**5. Mobil menü binding sırası**

```javascript
function bind() {
  // Önce drawer, sonra nav — sıra önemli
  const menuBtn = qs('menuToggle');
  if (menuBtn) menuBtn.onclick = openDrawer;

  const drawerClose = qs('drawerClose');
  if (drawerClose) drawerClose.onclick = closeDrawer;

  const backdrop = qs('drawerBackdrop');
  if (backdrop) backdrop.onclick = closeDrawer;

  // Guard: element yoksa hata verme
}
```

**6. Null guard her querySelector'da**

```javascript
function qs(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element #${id} not found`);
  return el;
}
```

**7. Grafik fallback CSS bileşeni**

```css
.chart-fallback {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) 0;
}
.chart-bar-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.chart-bar-label {
  width: 120px;
  font-size: 13px;
  color: var(--muted);
}
.chart-bar-track {
  flex: 1;
  height: 8px;
  background: var(--surface-3);
  border-radius: 4px;
  overflow: hidden;
}
.chart-bar-fill {
  height: 100%;
  background: var(--text);
  border-radius: 4px;
  transition: width 0.4s ease;
}
```
### P2 — İyileştirmeler (üçüncü geçiş)
- Senaryo custom input (kullanıcı kendi %'sini girebilir)
- Finder evrenine 3-4 hisse daha ekle
- Kavram tanımlarını genişlet (5 → 8 kavram)
- Portföy sağlık skorunu daha granüler yap
- `localStorage` olmadığı için state'i URL hash ile koru

***
## BÖLÜM 11 — Tasarım İlkeleri
### 1. Explanation-first
Her sayının yukarısında veya yanında ne anlama geldiği yazılı olmalı. Dashboard'da "87/100" yazan skor yanına "Beta 1.12 · nakit %14" gibi bir açıklama satırı zorunlu.
### 2. Tek birincil eylem her ekranda
Her sayfada kullanıcının ne yapması gerektiği bir saniyede anlaşılır. İki eşit ağırlıklı CTA yok.
### 3. Progressive disclosure
Karmaşık mantık (carry cost, haircut, SMA) başlangıçta gizli, kullanıcı geliştikçe açılır. Beginner seviye ilk 3 sayfayla tamamlanabilir.
### 4. Hata toleranslı render
Chart yüklenmese bile sayılar görünür. Bir bileşen çökse diğerleri hayatta kalır. Kullanıcı hiçbir zaman tamamen beyaz sayfa görmez.
### 5. Editorial monochrome
Sadece 2 non-neutral renk tonu (success yeşil, danger kırmızı) — sadece anlam taşıyan yerlerde. Başlık fontları DM Serif Display, UI fontları DM Sans. Renkli kenarlı kartlar yasak.
### 6. İkon asla yalnız
Her ikon mutlaka ya `aria-label` ya da yanında metin etiketiyle gelmeli.  Ikon-only butonlar sadece topbar'da (toggle) ve kapat butonlarında kullanılabilir, o zaman bile `sr-only` span zorunlu.[^1]

***
## BÖLÜM 12 — Build Roadmap
### MVP (v1.0) — Şu an inşa edilen
- Dashboard (portföy sağlık skoru + dağılım)
- Portfolio tablosu + pozisyon ekleme
- Margin simülatörü (3 ayarlı slider + grafik)
- 6 hazır senaryo + cash vs margin karşılaştırması
- Trade finder (bütçe + risk toleransı + mod)
- Kavram modalları (5 kavram)
- Light/dark mode
- Responsive (desktop + tablet + mobile)
### V2
- Collateral haircut simülasyonu
- House margin rules (broker seçimi)
- Özel senaryo girişi
- Portföy geçmiş P/L grafikleri
- Kavram genişletme (8-10 kavram)
- Rebalancing önerileri
### V3+
- Gerçek zamanlı fiyat entegrasyonu
- SMA bakiye takibi
- Liquidation ladder simülasyonu
- Çoklu portföy karşılaştırması
- Eğitim modu (adım adım guided flow)
### Yapılmaması gerekenler (şimdilik)
- VaR hesabı (çok teknik, beginner için anlamsız)
- Options margin (farklı mantık, farklı UI gerektirir)
- Sosyal/paylaşım özellikleri (önce solo flow olgunlaşmalı)
- Gerçek brokerage API (güvenlik ve yasal kapsam dışı)

***
## BÖLÜM 13 — En Büyük Hatalar ve Kaçınılacaklar
| Hata | Etki | Alternatif |
|---|---|---|
| CDN bağımlı ikonlar | Sayfada boşluklar | Inline SVG sprite |
| defer + DOMContentLoaded karışımı | Race condition, app çöker | Scriptler body sonuna, senkron yükle |
| 0 try/catch bloku | Tek hata her şeyi öldürür | Her render fonksiyonu izole |
| Grafik önce, metin sonra | Chart hatası → KPI'lar da boş | Text render bağımsız olmalı |
| Emoji ikon | Unprofessional, erişilemez | Lucide/Phosphor inline SVG |
| Colored side border on cards | AI template görünümü [^8] | Surface elevation veya badge |
| Aynı ağırlıkta 2 CTA | Kullanıcı ne yapacağını bilemez | Primary + secondary hiyerarşi |
| Black-box scoring | Kullanıcı güvenmez | Her skor satırında gerekçe |
| Modal ile pozisyon ekleme | Bağlam kaybı | Inline form, sayfa içinde |
| localStorage kullanımı | Sandbox'ta crash | In-memory state |

***
## EK A — İkon Katalogu (Inline SVG paths)
Tüm ikonlar Lucide 0.x standart path'leri ile 24×24 viewBox, `fill:none`, `stroke:currentColor`, `stroke-width:2`:

| ID | Kullanım | Path özeti |
|---|---|---|
| `ic-dashboard` | Nav: Genel Bakış | Grid benzeri panel layout |
| `ic-briefcase` | Nav: Portföy | Çanta simgesi |
| `ic-calculator` | Nav: Simulator | Hesap makinesi |
| `ic-waypoints` | Nav: Senaryolar | Yol dallanma |
| `ic-scan-search` | Nav: Finder | Büyüteç + tarama |
| `ic-book` | Nav: Eğitim | Açık kitap |
| `ic-menu` | Topbar: hamburger | 3 yatay çizgi |
| `ic-x` | Kapat butonları | Çarpı |
| `ic-moon` | Tema toggle | Ay |
| `ic-sun` | Tema toggle | Güneş |
| `ic-wallet` | Metric: portföy | Cüzdan |
| `ic-shield` | Metric: buffer | Kalkan + onay |
| `ic-pie` | Metric: konsantrasyon | Pasta dilim |
| `ic-info` | Warning box: info | Daire + i |
| `ic-alert` | Warning box: dikkat | Üçgen + ! |
| `ic-bulb` | Modal: örnek | Ampul |
| `ic-plus` | Pozisyon ekle | Artı |

***
## EK B — Veri Modeli
### Portfolio pozisyonu
```javascript
{
  ticker: string,    // "NVDA"
  shares: number,    // 3
  price: number,     // 196 (güncel fiyat)
  cost: number,      // 142 (alış fiyatı)
  beta: number       // 1.75
}
```
### Hesaplanmış portföy stats
```javascript
{
  assets: [...],         // enriched pozisyonlar (value, weight, pl eklenmiş)
  total: number,         // toplam değer
  cash: number,          // nakit değeri
  invested: number,      // hisse değeri
  largest: asset,        // en büyük pozisyon
  concentration: number, // en büyük % ağırlık
  cashRatio: number,     // nakit %
  weightedBeta: number,  // portföy ağırlıklı beta
  health: number         // [28-96] aralığında sağlık skoru
}
```
### Margin hesabı
```javascript
{
  price, shares, cash, init, maint, rate,
  value,           // price × shares
  requiredEquity,  // value × init
  equity,          // kullanıcı özsermayesi
  borrow,          // value - equity
  callPrice,       // borrow / (shares × (1 - maint))
  buffer,          // (price - callPrice) / price × 100
  annualInterest   // borrow × rate
}
```
### Senaryo
```javascript
{
  name: string,   // "Bear -20%"
  move: number    // -20 (yüzde)
}
```

---

## References

1. [Accessibility in depth - Lucide](https://lucide.dev/guide/accessibility) - Beautiful & consistent icon toolkit made by the community.

2. [Fintech UX Design: 10 Best Practices for Dashboards [2026]](https://www.wildnetedge.com/blogs/fintech-ux-design-best-practices-for-financial-dashboards) - Financial dashboard design guide. Data viz, accessibility & conversion best practices.

3. [Guide on Fintech Dashboard Design - Urban Geko](https://www.urbangekodesign.com/fintech-dashboard-design/) - Our guide on fintech dashboard design

4. [Fintech Dashboard Design: Patterns and Best Practices - Designpixil](https://designpixil.com/blog/fintech-dashboard-design) - Design patterns for fintech dashboards and payment platforms — precision, trust signals, compliance ...

5. [Trinity Capital Declares Monthly Cash Distribution of $0.17 per ...](https://www.marketscreener.com/news/trinity-capital-declares-monthly-cash-distribution-of-0-17-per-share-for-the-third-quarter-of-2026-ce7f5cddd88dfe27) - TRIN dividend has remained consistent for more than six years PHOENIX, June 17, 2026 /PRNewswire/ --...

6. [Product tour best practices in 2026: from setup to optimization](https://www.guideflow.com/blog/product-tour-best-practices) - Practical product tour best practices for SaaS teams. Learn how to plan, build, and measure tours th...

7. [UX/UI Design Best Practices for Fintech Mobile Apps](https://medium.com/@shane.cornerus/ux-ui-design-best-practices-for-fintech-mobile-apps-7e469f18df15) - In today’s fast-evolving financial landscape, the demand for innovative, efficient, and secure digit...

8. [UX Playbook for Finance](https://services.google.com/fh/files/events/pdf_finance_ux_playbook.pdf)

50. [How Does Margin Trading REALLY Work? (COMPLETE GUIDE)](https://www.youtube.com/watch?v=kMZnc01v5E8) - Trading on margin can be both a very powerful and very dangerous tool. It essentially allows you to ...

