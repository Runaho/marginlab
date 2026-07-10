<script lang="ts">
  import { onMount } from 'svelte';
  import { app, setActiveScenario, setPendingTrade } from '$lib/state/appState.svelte';
  import { portfolioStats } from '$lib/engine/portfolio';
  import { marginCalc } from '$lib/engine/margin';
  import { computeCosts, COST_LABELS } from '$lib/engine/costs';
  import { erosionTimeline } from '$lib/engine/scenario';
  import { SCENARIOS } from '$lib/engine/presets';
  import { MARKET, getMarket } from '$lib/engine/market';
  import type { ScenarioInput } from '$lib/engine/types';
  import { fmtMoney, fmtPct, fmtNum } from '$lib/utils/format';
  import { openConcept } from '$lib/state/conceptStore';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import RangeSlider from '$lib/components/ui/RangeSlider.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';

  const stats = $derived(portfolioStats(app.portfolio));

  let ticker = $state('NVDA');
  let price = $state(getMarket('NVDA')?.price ?? 196);
  let shares = $state(3);
  let equity = $state(0);
  let init = $state(app.portfolio.account.initialMargin);
  let maint = $state(app.portfolio.account.maintenanceMargin);
  let rate = $state(app.portfolio.account.rate);
  let holdingDays = $state(30);

  // Seçili hisse değişince varsayılanları doldur
  function pickTicker(t: string) {
    ticker = t;
    const u = getMarket(t);
    if (u) {
      price = u.price;
      if (equity <= 0) equity = price * shares * app.portfolio.account.initialMargin;
    }
  }

  const account = $derived({ initialMargin: init, maintenanceMargin: maint, rate });
  const result = $derived(
    marginCalc({
      price,
      shares,
      equity: equity > 0 ? equity : price * shares * init,
      account,
      availableCollateral: stats.availableCollateral
    })
  );

  const activeScenario = $derived<ScenarioInput>(
    SCENARIOS.find((s) => s.name === app.activeScenario) ?? SCENARIOS[0]
  );

  const costs = $derived(
    computeCosts({ shares, price, borrow: result.borrow, holdingDays, rate })
  );

  const erosion = $derived(
    erosionTimeline({
      price,
      shares,
      borrow: result.borrow,
      dailyDrop: activeScenario.dailyDrop !== 0 ? activeScenario.dailyDrop : -0.03,
      days: activeScenario.days,
      maintenanceMargin: maint
    })
  );

  const alertLevel = $derived(
    !result.canOpen ? 'danger' : result.alert === 'danger' ? 'danger' : result.alert === 'warning' ? 'warning' : 'success'
  );

  onMount(() => {
    if (app.pendingTrade) {
      pickTicker(app.pendingTrade.ticker);
      shares = app.pendingTrade.shares;
      setPendingTrade(null);
    }
  });
</script>

<PageHeader eyebrow="Ön-trade analiz" title="Margin Simülatörü" desc="Bu trade′i margin ile alsam ne olur? Portföy teminatını ve senaryo düşüşünü gerçek zamanlı gör." />

<GuidedNote title="Açıkla — sonra hesapla">
  Sağ paneldeki <strong>call fiyatı</strong> sürdürme sınırını kırdığın yerdir. <strong>Buffer</strong> ise güncel fiyatla bu sınır arasındaki mesafedir: pozitifse güvendesin, sıfırsa bugün çağrılırsın.
</GuidedNote>

<div class="sim">
  <section class="card inputs">
    <h3>1 · Pozisyon girişi</h3>
    <label>Ticker (piyasa verisi)
      <select value={ticker} onchange={(e) => pickTicker((e.currentTarget as HTMLSelectElement).value)}>
        {#each MARKET as u}<option value={u.ticker}>{u.ticker} — {u.company}</option>{/each}
      </select>
    </label>
    <div class="row">
      <label>Fiyat ($)<input type="number" min="0" step="0.01" bind:value={price} oninput={() => (equity = price * shares * init)} /></label>
      <label>Adet<input type="number" min="1" bind:value={shares} oninput={() => (equity = price * shares * init)} /></label>
    </div>
    <label>Özkaynak / kendi paran ($)
      <input type="number" min="0" step="0.01" bind:value={equity} />
      <span class="micro">Gerekli: {fmtMoney(price * shares * init)} (başlangıç teminatı)</span>
    </label>
    <div class="row">
      <RangeSlider label="Başlangıç teminatı" min={0.1} max={0.9} step={0.05} value={init} oninput={(v) => (init = v)} format={(v) => fmtPct(v * 100, 0)} />
      <RangeSlider label="Sürdürme teminatı" min={0.1} max={0.5} step={0.05} value={maint} oninput={(v) => (maint = v)} format={(v) => fmtPct(v * 100, 0)} />
    </div>
    <RangeSlider label="Yıllık margin faizi" min={0} max={0.2} step={0.005} value={rate} oninput={(v) => (rate = v)} format={(v) => fmtPct(v * 100, 1)} />
    <RangeSlider label="Tutma süresi (gün)" min={1} max={365} step={1} value={holdingDays} oninput={(v) => (holdingDays = v)} format={(v) => `${v} gün`} />

    <div class="concept-row">
      <button class="clink" onclick={() => openConcept('callprice')}><Icon name="info" size={14} /> Call fiyatı</button>
      <button class="clink" onclick={() => openConcept('buffer')}><Icon name="info" size={14} /> Buffer</button>
      <button class="clink" onclick={() => openConcept('carry')}><Icon name="info" size={14} /> Taşıma maliyeti</button>
    </div>
  </section>

  <section class="card results">
    <h3>2 · Anlık hesap</h3>
    <div class="res-grid">
      <div class="res"><span>Pozisyon değeri</span><strong class="tabular">{fmtMoney(result.tradeValue)}</strong></div>
      <div class="res"><span>Gerekli özkaynak</span><strong class="tabular">{fmtMoney(result.requiredEquity)}</strong></div>
      <div class="res"><span>Margin borcu</span><strong class="tabular">{fmtMoney(result.borrow)}</strong></div>
      <div class="res"><span>Call fiyatı</span><strong class="tabular">{fmtMoney(result.callPrice)}</strong></div>
      <div class="res"><span>Yıllık faiz</span><strong class="tabular">{fmtMoney(result.annualInterest)}</strong></div>
      <div class="res hl"><span>Buffer</span><strong class="tabular">{fmtPct(result.bufferPct, 1)}</strong></div>
    </div>

    {#if !result.canOpen}
      <WarningBox level="danger" title="Teminat yetersiz — açılamaz" detail={result.rationale} />
    {:else}
      <WarningBox level={alertLevel} title={alertLevel === 'success' ? 'Açılabilir — güvenli' : alertLevel === 'warning' ? 'Açılabilir — ince buffer' : 'Açılabilir ama riskli'} detail={result.rationale} />
    {/if}

    <details class="costs">
      <summary>Maliyet dökümü ({holdingDays} gün)</summary>
      <ul>
        {#each Object.keys(COST_LABELS) as k (k)}
          {@const key = k as keyof typeof costs}
          {#if k !== 'total'}
            <li><span>{COST_LABELS[key]}</span><span class="tabular">{fmtMoney(costs[key])}</span></li>
          {/if}
        {/each}
        <li class="tot"><span>{COST_LABELS.total}</span><span class="tabular">{fmtMoney(costs.total)}</span></li>
      </ul>
      <p class="micro">Toplam maliyet, kâr etmek için gereken minimum getiri eşiğidir. Küçük portföyde bu oran %3-5′i bulabilir.</p>
    </details>
  </section>
</div>

<section class="card scenario">
  <div class="card-head">
    <h3>3 · Senaryo projeksiyonu — özkaynak erozyonu</h3>
    <Badge level={erosion.mcDay < 0 ? 'safe' : erosion.mcDay < 5 ? 'danger' : 'warning'} label={erosion.mcDay < 0 ? 'Runway uzun' : `MC günü ${erosion.mcDay}`} />
  </div>
  <p class="sc-desc">Seçili senaryo: <strong>{activeScenario.name}</strong> — {activeScenario.description}</p>
  <div class="chips">
    {#each SCENARIOS as s (s.name)}
      <button class="chip" class:active={s.name === app.activeScenario} onclick={() => setActiveScenario(s.name)}>{s.name}</button>
    {/each}
  </div>
  <LineChart
    points={erosion.points.map((p) => ({ x: p.day, y: p.equityRatio, marker: p.marginCalled }))}
    threshold={maint * 100}
  />
  <p class="micro">
    Günlük düşüş {fmtPct(activeScenario.dailyDrop * 100, 0)} · {activeScenario.days} gün. Kırmızı nokta margin call′ın
    ilk görüldüğü gündür. Fiyat yatay kalsa bile faiz taşıma maliyeti sessizce eritir.
  </p>
</section>

<style>
  .sim {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
    margin-bottom: var(--space-6);
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .card h3 {
    font-size: 20px;
    margin-bottom: var(--space-4);
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: var(--space-3);
  }
  label input,
  label select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
  .micro {
    font-size: 12px;
    color: var(--faint);
    margin-top: 4px;
  }
  .concept-row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    margin-top: var(--space-2);
  }
  .clink {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--muted);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 5px 10px;
    cursor: pointer;
  }
  .res-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .res {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .res span {
    font-size: 12px;
    color: var(--muted);
  }
  .res strong {
    font-size: 18px;
  }
  .res.hl {
    background: var(--text);
    border-color: var(--text);
  }
  .res.hl span {
    color: var(--inverse);
    opacity: 0.8;
  }
  .res.hl strong {
    color: var(--inverse);
  }
  .costs {
    margin-top: var(--space-4);
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }
  .costs summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
  }
  .costs ul {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
  }
  .costs li {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    border-top: 1px solid var(--border);
    font-size: 14px;
  }
  .costs li.tot {
    font-weight: 700;
    border-top: 2px solid var(--border);
    margin-top: 4px;
  }
  .scenario .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }
  .sc-desc {
    font-size: 14px;
    color: var(--muted);
    margin: 0 0 var(--space-3);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: var(--space-4);
  }
  .chip {
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }
  .chip.active {
    background: var(--text);
    color: var(--inverse);
    border-color: var(--text);
  }
  @media (max-width: 960px) {
    .sim {
      grid-template-columns: 1fr;
    }
  }
</style>
