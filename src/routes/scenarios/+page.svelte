<script lang="ts">
  import { app, setActiveScenario } from '$lib/state/appState.svelte';
  import { scenarioCalc } from '$lib/engine/scenario';
  import { SCENARIOS } from '$lib/engine/presets';
  import { MARKET, getMarket } from '$lib/engine/market';
  import type { ScenarioInput } from '$lib/engine/types';
  import { fmtMoney, fmtPct } from '$lib/utils/format';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';

  let ticker = $state('NVDA');
  let shares = $state(3);
  let equity = $state(0);

  function pickTicker(t: string) {
    ticker = t;
    const u = getMarket(t);
    if (u) {
      if (equity <= 0) equity = u.price * shares * 0.5;
    }
  }

  const price = $derived(getMarket(ticker)?.price ?? 196);

  const results = $derived(
    SCENARIOS.map((s) => ({
      scenario: s,
      r: scenarioCalc({
        price,
        shares,
        equity: equity > 0 ? equity : price * shares * 0.5,
        account: app.portfolio.account,
        scenario: s,
        holdingDays: 30
      })
    }))
  );

  const active = $derived(
    results.find((x) => x.scenario.name === app.activeScenario) ?? results[0]
  );

  const maxAbs = $derived(
    Math.max(
      1,
      ...results.flatMap((x) => [Math.abs(x.r.marginPL), Math.abs(x.r.cashPL)])
    )
  );

  const compareData = $derived([
    {
      label: 'Nakit',
      value: Math.abs(active.r.cashPL),
      color: active.r.cashPL >= 0 ? 'var(--success)' : 'var(--danger)'
    },
    {
      label: 'Margin',
      value: Math.abs(active.r.marginPL),
      color: active.r.marginPL >= 0 ? 'var(--text)' : 'var(--danger)'
    }
  ]);

  const verdictLevel = $derived(
    active.r.verdict === 'Kontrollü' ? 'success' : active.r.verdict === 'Dikkat' ? 'warning' : 'danger'
  );
</script>

<PageHeader eyebrow="Stres testi" title="Senaryolar" desc="Aynı trade′i sekiz farklı piyasa ortamında test et. Margin hem kazancı hem kaybı büyütür." />

<GuidedNote title="Nakit vs Margin">
  <strong>Flat</strong> senaryosu en öğreticisidir: fiyat hiç değişmez ama taşıma maliyeti (faiz) yine de kayıp
  üretir. Margin′in bedelini burada görürsün.
</GuidedNote>

<section class="trade-bar card">
  <span class="lbl">Test trade′i:</span>
  <select value={ticker} onchange={(e) => pickTicker((e.currentTarget as HTMLSelectElement).value)}>
    {#each MARKET as u}<option value={u.ticker}>{u.ticker}</option>{/each}
  </select>
  <label>Adet<input type="number" min="1" bind:value={shares} oninput={() => (equity = price * shares * 0.5)} /></label>
  <label>Özkaynak $<input type="number" min="0" step="0.01" bind:value={equity} /></label>
  <span class="hint">@ {fmtMoney(price)} · gerekli özkaynak {fmtMoney(price * shares * 0.5)}</span>
</section>

<div class="cards">
  {#each results as x (x.scenario.name)}
    {@const lvl = x.r.verdict === 'Kontrollü' ? 'success' : x.r.verdict === 'Dikkat' ? 'warning' : 'danger'}
    <button class="scard" class:active={x.scenario.name === app.activeScenario} onclick={() => setActiveScenario(x.scenario.name)}>
      <div class="sc-top">
        <span class="sc-name">{x.scenario.name}</span>
        <Badge level={lvl} label={x.r.verdict} />
      </div>
      <div class="sc-shock">{fmtPct((x.scenario.tradeShock - x.scenario.portfolioShock) * 100, 0)} ayrışma</div>
      <div class="sc-pl tabular">Margin P/L: {fmtMoney(x.r.marginPL, { sign: true })}</div>
    </button>
  {/each}
</div>

<section class="card detail">
  <div class="card-head">
    <h3>{active.scenario.name} — detay</h3>
    <Badge level={verdictLevel} label={active.r.verdict} />
  </div>
  <p class="desc">{active.scenario.description}</p>

  <div class="split">
    <div class="split-box">
      <div class="sb-label">Nakit P/L</div>
      <div class="sb-val tabular" class:pos={active.r.cashPL >= 0} class:neg={active.r.cashPL < 0}>{fmtMoney(active.r.cashPL, { sign: true })}</div>
      <div class="sb-sub">{shares} adet yerine sadece özkaynağınla alırsan</div>
    </div>
    <div class="split-box">
      <div class="sb-label">Margin P/L</div>
      <div class="sb-val tabular" class:pos={active.r.marginPL >= 0} class:neg={active.r.marginPL < 0}>{fmtMoney(active.r.marginPL, { sign: true })}</div>
      <div class="sb-sub">Yeni özkaynak oranı: {fmtPct(active.r.newEquityRatio, 1)}</div>
    </div>
  </div>

  <div class="mult">
    <Badge level={active.r.marginPL >= active.r.cashPL ? 'success' : 'danger'} label={`Kaldıraç ${active.r.multiplier.toFixed(1)}×`} />
    <span class="mult-note">Margin, nakit sonucunu {active.r.multiplier.toFixed(1)} katına çıkarır (artı veya eksi).</span>
  </div>

  <div class="chart-box">
    <BarChart data={compareData} max={maxAbs} />
  </div>

  <WarningBox level={verdictLevel} title={active.r.verdict} detail={active.scenario.name === 'Flat' ? 'Fiyat sabit ama taşıma maliyeti kayıp üretiyor — margin′in sessiz bedeli bu.' : active.r.verdict === 'Kırılgan' ? 'Bu senaryoda özkaynak oranın sürdürme sınırının altına düşer; margin call tetiklenir.' : active.r.verdict === 'Dikkat' ? 'Buffer ince; küçük bir ek düşüşte sınırı kırarsın.' : 'Bu senaryoda yapı sürdürme sınırının üzerinde kalır.'} />
</section>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .trade-bar {
    display: flex;
    align-items: flex-end;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-6);
  }
  .trade-bar .lbl {
    font-weight: 700;
    font-size: 14px;
  }
  .trade-bar select,
  .trade-bar input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 11px;
    font-size: 14px;
    color: var(--text);
  }
  .trade-bar label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  .hint {
    font-size: 13px;
    color: var(--muted);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
  .scard {
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 180ms ease, transform 180ms var(--ease);
  }
  .scard:hover {
    transform: translateY(-2px);
  }
  .scard.active {
    border-color: var(--text);
    box-shadow: inset 0 0 0 1px var(--text);
  }
  .sc-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sc-name {
    font-family: var(--font-display);
    font-size: 19px;
  }
  .sc-shock {
    font-size: 12px;
    color: var(--muted);
  }
  .sc-pl {
    font-size: 13px;
    font-weight: 600;
  }
  .detail .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }
  .detail .card-head h3 {
    font-size: 22px;
  }
  .desc {
    color: var(--muted);
    margin: 0 0 var(--space-4);
    line-height: 1.5;
  }
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  .split-box {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }
  .sb-label {
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
  }
  .sb-val {
    font-size: 26px;
    font-weight: 700;
    margin: 4px 0;
  }
  .sb-sub {
    font-size: 12px;
    color: var(--muted);
  }
  .pos {
    color: var(--success);
  }
  .neg {
    color: var(--danger);
  }
  .mult {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }
  .mult-note {
    font-size: 13px;
    color: var(--muted);
  }
  .chart-box {
    margin-bottom: var(--space-4);
  }
  @media (max-width: 960px) {
    .cards {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 640px) {
    .cards {
      grid-template-columns: 1fr;
    }
    .split {
      grid-template-columns: 1fr;
    }
  }
</style>
