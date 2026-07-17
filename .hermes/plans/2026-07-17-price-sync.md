# Plan: Browser-Driven Price Refresh (2026-07-17)

## Problem

MarginLab'in portfoy sayfasinda kullanici gercek broker pozisyonlarini
girdiginde sample/snapshot fiyatlar egitim degerini dusuruyor. Yahoo
Finance, Finnhub vb. gibi kaynaklar browser'dan direkt erisilemez
(CORS), public CORS proxy'leri ise datacenter IP'leri nedeniyle
calismiyor.

## Research findings (puppeteer + curl, datacenter IP)

Test edilen kaynaklar ve sonuclari:

| Kaynak              | Endpoint                              | Sonuc                            |
|---------------------|---------------------------------------|----------------------------------|
| Stooq               | /q/l/?s=csco.us&e=csv                 | CORS blocked                     |
| Yahoo v7 quote      | /v7/finance/quote                     | CORS blocked                     |
| Yahoo v8 chart      | /v8/finance/chart/CSCO                | CORS blocked                     |
| Finnhub             | /api/v1/quote                         | 401 (key gerekli)                |
| Twelve Data         | /quote                                 | 401 (key gerekli)                |
| AllOrigins /raw     | proxy                                 | Connection reset (IP block)      |
| CorsProxy.io        | proxy                                 | Failed fetch                     |
| CORS.SH             | proxy                                 | Failed fetch                     |
| CodeTabs            | proxy                                 | Timeout                          |
| ThingProxy          | proxy                                 | Failed fetch                     |

Hicbir free public kaynak browser'dan direkt calismiyor.

## Architecture: Cloudflare Worker proxy

Browser -> Worker (CORS acik, bizim kontrol) -> Yahoo Finance (server-to-server)
-> JSON response -> Browser cache.

```
+----------+         +-------------------+        +------------------+
| Browser  |  CORS   | Cloudflare Worker | server | Yahoo Finance v8 |
| marginlab| <-----> | /api/quote?sym=   | <-----> | /v8/finance/chart|
+----------+         +-------------------+        +------------------+
       |              |
       |              +-- KV cache (5dk stale, sonra refresh)
       |
       +-- Service Worker cache (browser side, 24h)
```

### Why Cloudflare Worker

- Ucretsiz: 100k request/gun (marginlab icin 10x fazla yeterli)
- CORS kontrol tamamen bizde: sadece marginlab origin'lerine izin
- KV cache: rate-limit + offline-friendly fallback
- Ayni Cloudflare hesabinda Pages + Worker birlikte host
- Tek endpoint, tek domain: marginlab-cors-proxy.<account>.workers.dev

### Why NOT CORS proxy services

- Datacenter IP'leri kara listeye alinmis (kendi testimizde gorduk)
- Abuse riski, ani kapanma riski
- ToS belirsiz
- Cache kontrolu yok
- Privacy: hangi kaynak proxy'leniyor seffaf degil

## Universe Expansion - strategy

Eski yaklasim (yanlis): "60 sembol hardcoded et, kullanici secsin."

Yeni yaklasim: Worker sembol validation yapsin, marketData.json sadece
"onbellek/ornekler" olsun. Kullanici herhangi bir ticker girebilir:

1. Kullanici 'CSCO' yazar (veya autocomplete oneri)
2. Worker Yahoo'ya sorar: "bu sembol gecerli mi, fiyati ne?"
3. Yahoo longName + exchange + currency + price doner
4. Cache'lenir, sonraki yukleme hizli

marketData.json = "seed/cache" (~25 ogretici sembol, tum sektor dagilimi)
Worker Yahoo = "live resolution"
marginlab settings = "varsayimsal assumptionlar" (educational sample)

## Deliverables

### Phase 1: Cloudflare Worker (1 gun)
- Repo: github.com/Runaho/marginlab-cors-proxy (public)
- Dosya: src/index.ts (Worker code, ~50 satir)
- KV cache binding: QUOTE_CACHE
- CORS whitelist: marginlab.pages.dev, localhost dev
- Endpoints:
  - GET /api/quote?symbol=AAPL -> Yahoo v8 /chart wrapper
  - GET /api/batch?symbols=AAPL,MSFT -> paralel fetch + cache merge
  - GET /api/health -> cache stats + last-fetch timestamp

### Phase 2: marginlab integration (1 gun)
- src/lib/services/priceFetcher.ts (yeni dosya)
  - fetchQuote(symbol) -> { price, change, name, currency, exchange, asOf }
  - fetchBatch(symbols[]) -> Map<symbol, Quote>
  - Cache in-memory (24h) + fallback to last-known
- src/routes/portfolio/+page.svelte UI:
  - Toolbar: "Refresh prices" butonu (toplu)
  - Her satir: "↻" simgesi (tekil)
  - Stale indicator (son fetch > 24h -> uyari)
- Settings toggle: "Auto-refresh on load" (default OFF)

### Phase 3: Cache + UX polish (0.5 gun)
- Worker KV TTL: 5 dakika
- Service Worker: 24h browser cache (offline-friendly)
- Rate limit UI: "Son guncelleme X dakika once"
- Empty state fallback: ticker yoksa user-friendly error
- CORS error UI: Worker ulasilamazsa fallback to static data

### Phase 4 (opsiyonel, paralel): Universe expansion
- marketData.json'a 25 ornek sembol ekle (sektor dagilimli)
- Auto-seed sample data cache
- README guncelle

## Risks

| Risk                              | Mitigation                                              |
|-----------------------------------|---------------------------------------------------------|
| Yahoo Finance ToS degisir         | Worker fallback: Finnhub veya Stooq ekle                |
| Cloudflare Worker kota asim       | Cache TTL agresiflestir (10dk), kullanici kontrollu     |
| Yahoo yanlis/duplicate data       | Education simulator disclaimers zaten var               |
| Yahoo rate limit                  | KV cache, batch endpoint, sequential fallback           |
| Worker downtime                   | localStorage fallback to last-known values             |
| Privacy (loglanir mi?)            | Worker'da log tutulmaz, KV'de cache sadece fiyat        |

## Open Questions (kullaniciya sorulacak)

1. Sample vs live default: Ilk ziyaret sample mi, yoksa her hisse icin
   "Bu sembol canli kaynaktan mi alinsin?" toggle mi?
   Onerim: Sample default, opt-in live refresh.

2. API key stratejisi: Yahoo Finance unlicensed (gri alan) mi, yoksa
   Finnhub free tier + key mi? (Finnhub public key = abuse riski)
   Onerim: Yahoo basla, Finnhub'a gecis kolay.

3. Trade-off aciklamasi: "backend'siz" derken "kendi sunucumuz yok,
   Cloudflare serverless var" demek gerek. Bu PR description'a yazilmali.

## Branch Strategy

- feat/universe-expansion (Phase 4, paralel baslar, kucuk)
- feat/cf-worker-proxy (Phase 1, yeni repo, ayri PR)
- feat/price-refresh (Phase 2-3, marginlab tarafi)
- feat/portfolio-onboarding (mevcut, PR open, merge bekliyor)

Bagimlilik sirasi:
1. feat/portfolio-onboarding merge -> master
2. feat/cf-worker-proxy repo olustur + deploy -> URL hazir
3. feat/price-refresh Worker URL'ini kullanir
4. feat/universe-expansion paralel, bagimsiz
