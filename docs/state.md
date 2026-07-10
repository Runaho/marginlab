# Durum Yönetimi (State)

Merkezi, reaktif uygulama durumu Svelte 5 runes ile yönetilir. Amaç: tek bir doğru durum,
URL′de taşınabilir olması (localStorage çökmesin) ve tema kalıcılığı.

> Klasör: `src/lib/state/`

---

## `appState.svelte.ts` — Merkezi Durum

Svelte 5′in `.svelte.ts` dosyasında modül seviyesinde `$state` kullanır.

### Durum şekli
```ts
app = $state({
  portfolio: PortfolioData,      // holdings + cash + account
  activeScenario: string,        // senaryo adı
  finder: FinderConfig,          // bulucu filtreleri
  guided: boolean,               // rehber modu açık mı
  theme: 'light' | 'dark',
  pendingTrade: { ticker, shares } | null  // bulucu -> simülatör devri
})
```

### Ana Fonksiyonlar
| Fonksiyon | Ne yapar |
|---|---|
| `setTheme(t)` / `toggleTheme()` | Temayı değiştirir, `localStorage` + `<html data-theme>` günceller |
| `applyTheme()` | DOM′a temayı uygular (layout açılışında) |
| `setCash(n)` / `setAccount(patch)` | Hesap ayarlarını günceller |
| `addHolding(h)` / `updateHolding(i, patch)` / `removeHolding(i)` | Pozisyon CRUD |
| `setActiveScenario(name)` | Aktif senaryoyu seçer |
| `setFinder(patch)` | Bulucu filtrelerini günceller |
| `setGuided(v)` | Rehber modunu açar/kapatır |
| `loadPortfolio(data)` / `resetPortfolio()` | Portföyü JSON′dan yükler/sıfırlar |
| `setPendingTrade(t)` | Bulucu′dan simülatöre trade devreder |

### Kalıcılık — URL Hash
- `hydrateFromHash()` — sayfa açılışında `#d=...` hash′ini `btoa`/JSON ile çözer, state′i doldurur.
- `syncHash()` — state değiştikçe `#d=<base64 JSON>`′a yazar (`history.replaceState`).
- Böylece sayfa yenilense bile portföy/filtreler korunur; `localStorage`′a uygulama verisi yazılmaz
  (read‑05′in "sandbox′ta localStorage çökmesin" kuralı).

### Tema istisnası
Tema `localStorage`′da tutulur (`mc-theme`) çünkü flash önleme script′i (`app.html`) ilk
render′dan önce tema uygular.

---

## `conceptStore.ts` — Kavram Modal Mağazası

Svelte `writable` store. Hangi kavramın modal′da açık olduğunu tutar.

```ts
conceptStore = writable<{ open: boolean; concept: Concept | null }>(...)
openConcept(key)   // key -> Concept bulur, modalı açar
closeConcept()     // modalı kapatır
```

`ConceptModal.svelte` bu store′ı dinler ve içerik olarak `concepts.ts`′ten ilgili kaydı gösterir.

---

## Reaktif Zincir (özet)

```
Kullanıcı girişi
   → appState mutator (ör. setCash)
   → $derived(portfolioStats(app.portfolio)) otomatik yenilenir
   → sayfa yeniden render
   → $effect → syncHash() → URL güncellenir
```

---

## Neden `$state` modül seviyesinde?
SvelteKit′te `.svelte.ts` dosyaları runes içerebilir. Modül seviyesinde tek bir `app` nesnesi
tutmaka, tüm sayfalar aynı merkezi durumu paylaşır; prop drilling gerekmez.

---

## Güvenlik / Gizlilik
- Uygulama verisi tarayıcıda kalır; hiçbir sunucuya gönderilmez.
- `parsePortfolio` kullanıcı JSON′ını katı doğrular (eksik `cash`, bozuk `holdings` vb. için
  Türkçe hata) — kötü biçimli dosya uygulamayı çökertmez.
