# UI Bileşenleri (Components)

Sunum katmanı. Hiçbir hesaplama burada yapılmaz; engine′den gelen değerleri görselleştirir ve
kullanıcı girişini toplar.

> Klasör: `src/lib/components/`

---

## İkonlar (`icons/`)

### `IconSprite.svelte`
Tüm Lucide‑tarzı SVG path′lerini içeren gizli `<svg><symbol>` sprite′ı. CDN bağımlılığı yok;
`currentColor` ile tema uyumlu; `aria-hidden`.

### `Icon.svelte`
Kullanımı: `<Icon name="dashboard" size={18} />`. `<use href="#ic-{name}">` ile sprite′dan çizer.

**Mevcut ikonlar:** dashboard, briefcase, calculator, waypoints, scan-search, book, menu, x,
moon, sun, wallet, shield, shield-check, shield-alert, pie, info, alert, bulb, plus, upload,
download, chevron, sliders, target, scale, trending.

---

## Layout (`layout/`)

### `Topbar.svelte`
Yapışkan üst bar: marka, mobil menü butonu, rehber (kitap) toggle, tema toggle. Mobilde `menu`
butonu görünür.

### `Sidebar.svelte`
Sol navigasyon: 6 nav linki (`nav.ts`) + "Bu ürün ne yapar?" bilgi kartı. Aktif link koyu dolu.

### `MobileDrawer.svelte`
Mobil için kayan drawer (`translateX`), backdrop tıklama/ESC ile kapanır. Sidebar′ı yeniden kullanır.

### `nav.ts`
`NavItem[]`: `{ href, label, icon, desc }` — tek yerden tüm rotaların tanımı.

---

## UI Primitives (`ui/`)

| Bileşen | Sorumluluk |
|---|---|
| `Badge.svelte` | `success/warning/danger/neutral` durum etiketi (pill) |
| `KpiCard.svelte` | Büyük metrik kartı: label, değer, hint, ikon, kenar rengi |
| `Metric.svelte` | Dashboard hero yan paneli küçük metrik |
| `WarningBox.svelte` | 3 seviyeli uyarı kutusu (success/warning/danger/neutral) |
| `Button.svelte` | `primary/secondary/ghost` hiyerarşili buton |
| `RangeSlider.svelte` | Dinamik değer etiketli kaydırıcı (margin/faiz/gün) |
| `Modal.svelte` | Genel modal: ESC/backdrop kapanır, scroll lock |
| `PageHeader.svelte` | Sayfa başlığı: eyebrow + H1 + açıklama + aksiyonlar |
| `GuidedNote.svelte` | Yalnızca `app.guided` açıkken görünen eğitsel not |

Tüm bileşenler `var(--...)` token′larını kullanır; light/dark otomatik uyumlu.

---

## Grafikler (`charts/`) — Özelleştirilmiş SVG

Bağımlılık riski olmadan, editorial tasarıma tam uyumlu, **metin‑önce** prensibiyle yazılmıştır.
Her grafik viewBox + `%` genişlik ile responsive′tir.

### `BarChart.svelte`
Dikey çubuk grafik. `data: { label, value, color }[]`, `max`, `unit`.
**Kullanım:** Dashboard sağlık profili.

### `Donut.svelte`
Halka grafik + legend. `data: { label, value, color }[]`.
**Kullanım:** Dashboard sektör dağılımı.

### `LineChart.svelte`
Çizgi grafik + sürdürme eşiği kesik çizgisi + margin call işaretçisi.
`points: { x, y, marker? }[]`, `threshold`.
**Kullanım:** Simülatör özkaynak erozyonu.

> Neden LayerChart değil? LayerChart kuruldu ama görsel doğrulama yapılamayan bir ortamda
> SVG bileşenleri daha güvenilir ve "metin önce, grafik sonra" kuralını garanti eder. İstenirse
> `layerchart` hâlâ `package.json`'dadır; kolayca geçiş yapılabilir.

---

## `ConceptModal.svelte`
`conceptStore`′ı dinler; açıkken `concepts.ts`′ten ilgili kavramı Modal içinde gösterir
(tanım + "üründe kullanımı" notu).

---

## Bileşen Kullanım Sözleşmesi
- Bileşenler `children` snippet′i alıyorsa `import('svelte').Snippet` tipiyle tanımlanır.
- Tüm sayısal değerler `utils/format.ts` (`fmtMoney`, `fmtPct`, …) ile biçimlenir.
- Renkler `utils/colors.ts` (`SECTOR_COLORS`, `levelColor`) üzerinden verilir.
