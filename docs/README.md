# MarginCall — Proje Dokümantasyonu

**MarginCall**, portföy destekli bir *margin (kaldıraç) karar stüdyosudur*. Bireysel yatırımcının,
bir trade′i margin ile açmadan önce **maliyetini, riskini ve portföyün taşıyıp taşıyamayacağını**
anlamasını sağlar. Bir hesap makinesi değil; açıklar‑sonra‑hesaplar yaklaşımına dayalı, eğitim
odaklı bir araçtır.

> Marka: dökümanlardaki orijinal "MarginLab" ürünü, bu projede **MarginCall** adıyla hayata
> geçirilmiştir. Motor mantığı ve editorial‑monochrome tasarım sistemi aynen korunmuştur.

---

## İçindekiler

- [architecture.md](./architecture.md) — katmanlı mimari ve veri akışı
- [engine.md](./engine.md) — hesaplama motoru modülleri (saf TS, test edilebilir)
- [data.md](./data.md) — JSON veri kaynakları (marketData, defaultPortfolio)
- [state.md](./state.md) — durum yönetimi ve kalıcılık (URL hash, tema)
- [components.md](./components.md) — UI bileşenleri (layout, ui, charts, ikonlar)
- [pages.md](./pages.md) — 6 sayfanın akışı ve kullandığı modüller
- [formulas.md](./formulas.md) — finans formülleri ve kaynakları

---

## Teknoloji Yığını

| Katman | Seçim | Neden |
|---|---|---|
| Framework | **SvelteKit + TypeScript** | Dosya tabanlı routing, runes ile reaktif durum, tip güvenliği |
| Derleme | **Vite** | Hızlı dev sunucu |
| Çıktı | **@sveltejs/adapter-static** (SPA, `fallback: index.html`) | Backend yok; saf istemci uygulaması |
| Stil | **Tailwind v4** + CSS custom properties | LayerChart uyumu ve Nexus token sistemi |
| Tipografi | **DM Serif Display** + **DM Sans** (`@fontsource`, CDN′siz) | Editorial monochrome dil |
| Grafik | **Özelleştirilmiş SVG bileşenleri** | Bağımlılık riski yok, tam editorial kontrol, "metin önce" kuralı |
| İkon | **Inline SVG sprite** | CDN race‑condition yok, `currentColor` ile tema uyumu |

---

## Dizin Yapısı

```
src/
├─ app.css                 # Nexus token'ları, tipografi, global reset
├─ app.html                # Tema flash önleyici script
├─ lib/
│  ├─ components/
│  │  ├─ icons/            # IconSprite + Icon (inline SVG)
│  │  ├─ layout/           # Topbar, Sidebar, MobileDrawer, nav
│  │  ├─ ui/               # Badge, KpiCard, Button, Modal, WarningBox, ...
│  │  ├─ charts/           # BarChart, Donut, LineChart (SVG)
│  │  └─ ConceptModal.svelte
│  ├─ data/                # marketData.json, defaultPortfolio.json
│  ├─ engine/              # Saf TS hesaplama mantığı
│  ├─ state/               # Reaktif durum + kalıcılık
│  ├─ utils/               # format, colors
│  └─ routes/              # 6 sayfa + layout
└─ static/                 # favicon.svg
```

---

## Hızlı Başlangıç

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # svelte-check (tsc + svelte)
npm run build      # SPA üretimi -> build/
npm run preview    # üretilen SPA'yı önizle
```

---

## Tasarım İlkeleri (kodun arkasındaki felsefe)

1. **Açıkla — sonra hesapla.** Her sayı bir gerekçe ile gelir (explanation‑first).
2. **Mantık kurumsal, arayüz sade.** `engine/` katı ve doğru; UI editorial ve okunaklı.
3. **Metin önce, grafik sonra.** Sayılar her zaman SVG grafiğinden bağımsız render edilir.
4. **Kademeli açılım (progressive disclosure).** Karar → anlama → uzman yüzeyi.
5. **Tek birincil aksiyon.** Her ekranda bir ana CTA.
6. **İkon asla yalnız.** Her görselin yanında metin/aria etiketi.
7. **Tek veri kaynağı.** Hisse evreni `marketData.json`'dur; her select/toast buradan beslenir.

Bu ilkeler `read-04` (Deep Research Foundation) ve `read-05` (MarginLab UI/UX spesifikasyonu)
dökümanlarından türetilmiştir.
