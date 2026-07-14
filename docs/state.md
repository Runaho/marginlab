# Durum Yönetimi (State)

Merkezi, reaktif uygulama durumu Svelte 5 runes ile yönetilir. Amaç: tek bir doğru durum,
paylaşım için explicit `Share` eylemi, otomatik kalıcılık için `localStorage`.

> Klasör: `src/lib/state/`

---

## `appState.svelte.ts` — Merkezi Durum

Svelte 5′in `.svelte.ts` dosyasında modül seviyesinde `$state` kullanır.

### Durum şekli
```ts
app = $state({
  portfolio: PortfolioData,             // holdings + cash + account
  activeScenario: string,               // aktif preset senaryo adı (veya fallback)
  activeCustomScenarioId: string | null, // aktif custom senaryo id (varsa)
  finder: FinderConfig,                 // bulucu filtreleri
  guided: boolean,                      // rehber modu açık mı
  theme: 'light' | 'dark',
  currentTrade: WorkingTrade | null,    // üzerinde çalışılan trade taslağı
  decisionLog: DecisionRecord[],        // Finder onay kayıtları (max 20)
  watchlist: WatchlistItem[],
  eduDone: Record<number, boolean>,     // education step tamamlanma durumu
  customScenarios: UserScenario[],      // kullanıcı tanımlı senaryolar (max 20)
  persistenceError: boolean             // quota aşımı sinyali
})
```

`WorkingTrade` tipi (`portfolioRepository.ts`):
```ts
interface WorkingTrade {
  ticker: string;
  shares: number;
  additionalCash: number;
  holdingDays: number;
  updatedAt: string; // ISO
}
```

`UserScenario` discriminated union (`engine/types.ts`):
```ts
type UserScenario =
  | { kind: 'simple'; tradeShock, portfolioShock, dailyDrop, days, ... }
  | { kind: 'path'; tradePath: AnchorPoint[]; portfolioPath: AnchorPoint[];
      interpolation: 'linear'|'step'; holdingPeriod; ... };
```

> **Aktif senaryo seçimi:** `app.activeCustomScenarioId` null değilse custom senaryo aktiftir; aksi halde `app.activeScenario` (preset adı) kullanılır. Her iki alan da `PersistShape`'te saklanır.

### Ana Fonksiyonlar
| Fonksiyon | Ne yapar |
|---|---|
| `setTheme(t)` / `toggleTheme()` | Temayı değiştirir, `localStorage` + `<html data-theme>` günceller |
| `applyTheme()` | DOM′a temayı uygular (layout açılışında) |
| `setCash(n)` / `setAccount(patch)` | Hesap ayarlarını günceller |
| `addHolding(h)` / `updateHolding(i, patch)` / `removeHolding(i)` | Pozisyon CRUD |
| `setActiveScenario(name)` | Aktif senaryoyu seçer |
| `setFinder(patch)` | Bulucu filtreleri |
| `setGuided(v)` | Rehber modunu açar/kapatır |
| `loadPortfolio(data)` / `resetPortfolio()` | Portföyü JSON′dan yükler/sıfırlar |
| `setCurrentTrade(t)` / `clearCurrentTrade()` | Üzerinde çalışılan trade taslağını yazar/sıfırlar |
| `setEduDone(n, v)` | Education step tamamlanma durumunu yazar |
| `buildShareUrl()` | `#d=<base64>` payload URL'i üretir (paylaşım için) |

### Kalıcılık — localStorage + explicit Share

- **`portfolioRepository.ts`** — `repository.ts` deseninin kopyası:
  - Storage key: `mc-app-state` (`mc-theme` / `mc-settings` / `marginlab.locale` ile aynı isim alanı).
  - `load()` / `save()` / `reset()` + `version: 1` migration (defaults'a deepMerge).
  - QuotaExceededError → `console.warn` + `false` döner; UI `app.persistenceError` set eder.
- **`hydrateFromStorage()`** — ilk yüklemede:
  1. `localStorage["mc-app-state"]`'i oku, `applyShape` ile state'e uygula.
  2. URL'de eski `#d=...` varsa: parse et → state'e uygula → localStorage'a yaz → `history.replaceState` ile hash'i temizle (geriye dönük uyumluluk, tek seferlik import).
- **`syncStorage()`** — `app.*` alanları değiştikçe 250ms debounce ile `repo.save(toPersistShape())`. URL temiz kalır; otomatik hash yazımı yok.
- **`buildShareUrl()`** — Topbar'daki Share butonu tarafından çağrılır. URL'i üretir + clipboard'a kopyalar (fallback: `prompt()`).

### Trade continuity (cross-screen working draft)

Kullanıcı bir trade'i bir ekranda planladığında diğer ekranlar aynı taslaktan devam eder:

- **Simulator** yazar — her input değişiminde `$effect` ile `setCurrentTrade(...)` çağrılır.
- **Scenarios** salt okunur — `$derived(app.currentTrade?.ticker ?? 'NVDA')` vb.
- **DecisionStrip** + **MarginCallMap** — `app.currentTrade` üzerinden gösterim.
- **Finder** onay modalı → `setCurrentTrade({ ticker, shares, additionalCash, holdingDays, updatedAt })`.

`pendingTrade` (eski tip) silinmiştir; gerekirse `setPendingTrade({ ticker, shares })` uyumluluk shim'i kullanılabilir (default `additionalCash=0`, `holdingDays=30`).

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
   → appState mutator (ör. setCash, setCurrentTrade)
   → $derived(portfolioStats(app.portfolio)) otomatik yenilenir
   → sayfa yeniden render
   → $effect → syncStorage() → localStorage["mc-app-state"] yazılır (250ms debounce)
   → Topbar Share butonu → buildShareUrl() → clipboard (explicit kullanıcı eylemi)
```

---

## Neden `$state` modül seviyesinde?
SvelteKit′te `.svelte.ts` dosyaları runes içerebilir. Modül seviyesinde tek bir `app` nesnesi
tutmaka, tüm sayfalar aynı merkezi durumu paylaşır; prop drilling gerekmez.

---

## Güvenlik / Gizlilik
- Uygulama verisi tarayıcıda kalır; hiçbir sunucuya gönderilmez.
- URL otomatik olarak state içermez; paylaşım yalnızca explicit `Share` eylemiyle olur.
- `parsePortfolio` kullanıcı JSON′ını katı doğrular (eksik `cash`, bozuk `holdings` vb. için
  Türkçe hata) — kötü biçimli dosya uygulamayı çökertmez.
- `hydrateFromStorage` schema validation uygular: `version !== 1` veya bozuk JSON
  `seedShape()`'a deepMerge ile geri döner (S-3 pattern'i).
