<script lang="ts">
  import { goto } from '$app/navigation';
  import { app, setFinder, setCurrentTrade, addDecision } from '$lib/state/appState.svelte';
  import { settings, getActiveProfileId } from '$lib/engine/settings/settingsStore.svelte';
  import { selectAccount } from '$lib/engine/selectors/selectAccount';
  import { resolveProfile } from '$lib/engine/account/settingsResolver';
  import { runFinder } from '$lib/engine/finder';
  import { SCENARIOS } from '$lib/engine/presets';
  import { allInstruments } from '$lib/engine/market';

  const profile = $derived(resolveProfile(settings, getActiveProfileId()));
  import type { FinderCandidate, FinderConfig, FinderMode, ScenarioScope, Holding } from '$lib/engine/types';
  import { fmtMoney, fmtPct, fmtShares } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import { sectorLabel, scenarioLabel } from '$lib/i18n/labels';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';

  const stats = $derived(
    selectAccount({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      profileId: getActiveProfileId(),
      settings
    })
  );

  let applied = $state<FinderConfig>({ ...app.finder });

  function run() {
    applied = { ...app.finder };
  }

  const ctx = $derived({
    availableFunds: stats.collateral.availableFunds,
    account: stats.account,
    budget: applied.budget,
    sectorWeights: stats.sectorWeights,
    costModel: settings.costModel,
    universe: allInstruments(app.portfolio.holdings, app.watchlist).map((i) => ({
      ticker: i.ticker,
      name: i.name,
      shares: 1,
      price: i.price,
      cost: i.price,
      beta: i.beta,
      collateral: profile.defaultEligibleEquityRate,
      sector: i.sector
    }))
  });

  const result = $derived(runFinder(applied, SCENARIOS, app.activeScenario, ctx));
  const universeNames = $derived(
    Object.fromEntries(ctx.universe.map((u) => [u.ticker, u.name]))
  );

  let preview = $state<FinderCandidate | null>(null);
  let inspectOpen = $state(false);
  let inspectSearch = $state('');
  let inspectOnlyInsufficient = $state(false);
  let inspectSort = $state<'ticker' | 'value' | 'resilience'>('ticker');

  const previewData = $derived.by(() => {
    if (!preview) return null;
    const before = stats;
    const projHoldings: Holding[] = [
      ...app.portfolio.holdings,
      {
        ticker: preview.ticker,
        name: preview.name,
        shares: preview.shares,
        price: preview.price,
        cost: preview.price,
        beta: preview.beta,
        collateral: profile.defaultEligibleEquityRate,
        collateralSource: 'default-assumption',
        sector: preview.sector
      }
    ];
    const after = selectAccount({
      cash: app.portfolio.cash,
      holdings: projHoldings,
      profileId: getActiveProfileId(),
      settings
    });
    return { before, after };
  });

  // Tüm enstrüman listesi; her biri için: ticker, name, price, eligible, topScore (varsa)
  interface InspectRow {
    ticker: string;
    name: string;
    price: number;
    eligible: boolean;
    topScore: number | null;
    topResilience: number | null;
    topResilienceTotal: number | null;
    topShares: number | null;
    reason: 'no-data' | 'no-budget' | 'no-eligibility' | 'calculated';
  }
  const inspectRows = $derived.by<InspectRow[]>(() => {
    const candidatesByTicker = new Map<string, FinderCandidate[]>();
    for (const c of [...result.global, ...Object.values(result.perStock).flat()]) {
      const arr = candidatesByTicker.get(c.ticker) ?? [];
      arr.push(c);
      candidatesByTicker.set(c.ticker, arr);
    }
    return ctx.universe.map((u) => {
      const cands = candidatesByTicker.get(u.ticker) ?? [];
      const best = cands.sort((a, b) => b.score - a.score)[0] ?? null;
      const eligible = !!(u.collateral > 0 && u.price > 0);
      let reason: InspectRow['reason'] = 'no-data';
      if (!eligible) reason = 'no-eligibility';
      else if (best) reason = 'calculated';
      else if (ctx.availableFunds <= 0) reason = 'no-budget';
      else reason = 'no-data';
      return {
        ticker: u.ticker,
        name: u.name,
        price: u.price,
        eligible,
        topScore: best?.score ?? null,
        topResilience: best?.resilience ?? null,
        topResilienceTotal: best?.resilienceTotal ?? null,
        topShares: best?.shares ?? null,
        reason
      };
    });
  });

  const inspectFiltered = $derived.by(() => {
    let rows = inspectRows;
    if (inspectSearch.trim()) {
      const q = inspectSearch.toLowerCase();
      rows = rows.filter((r) => r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    }
    if (inspectOnlyInsufficient) {
      rows = rows.filter((r) => r.reason !== 'calculated');
    }
    rows = [...rows].sort((a, b) => {
      if (inspectSort === 'ticker') return a.ticker.localeCompare(b.ticker);
      if (inspectSort === 'value') return b.price - a.price;
      return (b.topResilience ?? -1) - (a.topResilience ?? -1);
    });
    return rows;
  });

  function loadInto(c: FinderCandidate) {
    preview = c;
  }

  function confirmLoad() {
    if (!preview) return;
    addDecision({
      ts: new Date().toISOString(),
      ticker: preview.ticker,
      shares: preview.shares,
      price: preview.price,
      bufferPct: preview.bufferPct,
      mode: app.finder.mode,
      resilience: `${preview.resilience}/${preview.resilienceTotal}`,
      scope: app.finder.scope
    });
    setCurrentTrade({
      ticker: preview.ticker,
      shares: preview.shares,
      additionalCash: app.currentTrade?.additionalCash ?? 0,
      holdingDays: app.currentTrade?.holdingDays ?? 30,
      updatedAt: new Date().toISOString()
    });
    preview = null;
    goto('/simulator');
  }

  const modeExplain = $derived(
    app.finder.mode === 'safety'
      ? t('findModeExplainSafety')
      : app.finder.mode === 'upside'
        ? t('findModeExplainUpside')
        : t('findModeExplainBalanced')
  );

  const scopeLabel = $derived(
    app.finder.scope === 'worst'
      ? t('findScopeWorst')
      : app.finder.scope === 'average'
        ? t('findScopeAverage')
        : t('findScopeSelected')
  );
</script>

<PageHeader eyebrow={t('findEyebrow')} title={t('findTitle')} desc={t('findDesc')} />

<GuidedNote title={t('findGuidedTitle')}>
  {t('findGuidedBody')}
</GuidedNote>

<div class="finder">
  <aside class="card filters">
    <h3>{t('findFilters')}</h3>

    <div class="fgroup">
      <div class="fgroup-label">{t('findGoal')}</div>
      <label>{t('findDecisionGoal')}
        <select value={app.finder.goal} onchange={(e) => setFinder({ goal: (e.currentTarget as HTMLSelectElement).value as FinderConfig['goal'] })}>
          <option value="fit">{t('findGoalFit')}</option>
          <option value="safest">{t('findGoalSafest')}</option>
          <option value="return">{t('findGoalReturn')}</option>
        </select>
      </label>
      <label>{t('findScoreMode')}
        <select value={app.finder.mode} onchange={(e) => setFinder({ mode: (e.currentTarget as HTMLSelectElement).value as FinderMode })}>
          <option value="balanced">{t('findModeBalanced')}</option>
          <option value="safety">{t('findModeSafety')}</option>
          <option value="upside">{t('findModeUpside')}</option>
        </select>
      </label>
    </div>

    <div class="fgroup">
      <div class="fgroup-label">{t('findRisk')}</div>
      <label>{t('findRiskTolerance')}
        <select value={app.finder.riskTolerance} onchange={(e) => setFinder({ riskTolerance: (e.currentTarget as HTMLSelectElement).value as FinderConfig['riskTolerance'] })}>
          <option value="low">{t('findRiskLow')}</option>
          <option value="medium">{t('findRiskMed')}</option>
          <option value="high">{t('findRiskHigh')}</option>
        </select>
      </label>
    </div>

    <div class="fgroup">
      <div class="fgroup-label">{t('findUniverse')}</div>
      <label>{t('findScope')}
        <select value={app.finder.scope} onchange={(e) => setFinder({ scope: (e.currentTarget as HTMLSelectElement).value as ScenarioScope })}>
          <option value="selected">{t('findScopeSelected')}</option>
          <option value="average">{t('findScopeAverage')}</option>
          <option value="worst">{t('findScopeWorst')}</option>
        </select>
      </label>
    </div>

    <div class="fgroup">
      <div class="fgroup-label">{t('findConstraint')}</div>
      <label>{t('findBudget')}
        <input type="number" min="1" step="10" value={app.finder.budget} oninput={(e) => setFinder({ budget: parseFloat((e.currentTarget as HTMLInputElement).value) || 0 })} />
      </label>
      <label>{t('findMaxLot')}
        <input type="number" min="1" max="20" value={app.finder.maxLot} oninput={(e) => setFinder({ maxLot: Math.max(1, parseInt((e.currentTarget as HTMLInputElement).value) || 1) })} />
      </label>
    </div>

    <Button icon="scan-search" onclick={run}>{t('findRun')}</Button>
    <p class="avail">{t('findAvailCollateral')} <strong>{fmtMoney(stats.availableCollateral)}</strong></p>
  </aside>

  <div class="results" aria-live="polite">
    <p class="mode-note">{modeExplain} · {t('findScopeNote')} {scopeLabel}</p>
    <section>
      <h3 class="sec-title">{t('findGlobalTop')}</h3>
      <div class="cards">
        {#each result.global as c, i (c.ticker + c.shares)}
          <article class="fcard">
            <div class="fc-top">
              <span class="rank">#{i + 1}</span>
              <div class="fc-head">
                <div class="fc-title">{c.ticker} × {fmtShares(c.shares)}</div>
                <div class="fc-name">{universeNames[c.ticker]}</div>
              </div>
              <Badge
                kind="result"
                level={c.resilience === c.resilienceTotal ? 'success' : c.resilience >= c.resilienceTotal / 2 ? 'warning' : 'danger'}
                label={t('findResilientShort', { n: c.resilience, total: c.resilienceTotal })}
              />
            </div>
            <div class="badges">
              <Badge level="neutral" label={t('findBestIn', { scenario: scenarioLabel(c.bestInScenario) })} />
              <Badge level="neutral" label={c.mcDay < 0 ? t('simRunwayLong') : t('findWorstShort', { value: t('simMcDay', { day: c.mcDay }) })} />
            </div>
            <div class="kpis">
              <div><span>{t('findScore')}</span><strong class="tabular">{c.score.toFixed(1)}</strong></div>
              <div><span>{t('thValue')}</span><strong class="tabular">{fmtMoney(c.tradeValue)}</strong></div>
              <div><span>{t('findNetPL')}</span><strong class="tabular" class:pos={c.netPL >= 0} class:neg={c.netPL < 0}>{fmtMoney(c.netPL, { sign: true })}</strong></div>
              <div><span>{t('findBuffer')}</span><strong class="tabular">{fmtPct(c.bufferPct, 1)}</strong></div>
            </div>
            <p class="rationale">{c.rationale}</p>
            <details>
              <summary>{t('commonDetail')}</summary>
              <ul class="detail-list">
                <li><span>{t('findMarginDebt')}</span><span class="tabular">{fmtMoney(c.borrow)}</span></li>
                <li><span>{t('simMcDayLabel')}</span><span class="tabular">{c.mcDay < 0 ? t('simRunwayLong') : c.mcDay}</span></li>
                <li><span>{t('findBeta')}</span><span class="tabular">{c.beta.toFixed(2)}</span></li>
                <li><span>{t('lblSector')}</span><span>{sectorLabel(c.sector)}</span></li>
              </ul>
            </details>
            <Button variant="secondary" icon="calculator" onclick={() => loadInto(c)}>{t('findLoadTrade')}</Button>
          </article>
        {/each}
      </div>
    </section>

    <section>
      <h3 class="sec-title">{t('findPerStockTop')}</h3>
      <p class="empty-note">{t('findInspectHint')}</p>
      <button class="inspect-btn" type="button" onclick={() => (inspectOpen = true)}>
        {t('findInspectAll')}
      </button>
    </section>
  </div>
</div>

<Modal open={preview !== null} eyebrow={t('findPreviewTitle')} title={preview ? t('findPreviewLoad', { ticker: preview.ticker, shares: preview.shares }) : ''} onclose={() => (preview = null)}>
  {#if preview && previewData}
    <p class="pv-intro">{t('findPvIntro')}</p>
    <div class="pv-grid">
      <div class="pv-row">
        <span>{t('findAvailCollateral')}</span>
        <span class="tabular">{fmtMoney(previewData.before.availableCollateral)} → <strong>{fmtMoney(previewData.after.availableCollateral)}</strong></span>
      </div>
      <div class="pv-row">
        <span>{t('findMaxWeight')}</span>
        <span class="tabular">{fmtPct(previewData.before.concentration * 100, 0)} → <strong>{fmtPct(previewData.after.concentration * 100, 0)}</strong></span>
      </div>
      <div class="pv-row">
        <span>{t('findHealthScore')}</span>
        <span class="tabular">{previewData.before.health} → <strong>{previewData.after.health}</strong></span>
      </div>
      <div class="pv-row">
        <span>{t('findNewTradeBuffer')}</span>
        <span class="tabular"><strong>{fmtPct(preview.bufferPct, 1)}</strong></span>
      </div>
      <div class="pv-row">
        <span>{t('findResilience')}</span>
        <span class="tabular"><strong>{t('findResilienceCount', { resilient: preview.resilience, total: preview.resilienceTotal })}</strong></span>
      </div>
    </div>
    <p class="pv-foot">{t('findPvFoot')}</p>
    <div class="pv-actions">
      <Button variant="secondary" onclick={() => (preview = null)}>{t('commonCancel')}</Button>
      <Button onclick={confirmLoad}>{t('findLoadSim')}</Button>
    </div>
  {/if}
</Modal>

<Modal open={inspectOpen} eyebrow={t('findInspectAll')} title={t('findInspectAll')} onclose={() => (inspectOpen = false)} wide>
  <div class="inspect-toolbar">
    <input
      type="text"
      placeholder={t('findInspectSearch')}
      bind:value={inspectSearch}
      class="inspect-search"
    />
    <label class="inspect-sort">
      {t('findInspectSort')}:
      <select bind:value={inspectSort}>
        <option value="ticker">{t('findInspectSortTicker')}</option>
        <option value="value">{t('findInspectSortValue')}</option>
        <option value="resilience">{t('findInspectSortResilience')}</option>
      </select>
    </label>
    <label class="inspect-filter">
      <input type="checkbox" bind:checked={inspectOnlyInsufficient} />
      {t('findInsufficientFilter')}
    </label>
  </div>
  {#if inspectFiltered.length === 0}
    <div class="empty">
      <h4>{t('findEmptyTitle')}</h4>
      <p>{t('findEmptyBody')}</p>
    </div>
  {:else}
    <div class="inspect-table-wrap">
      <table class="inspect-table">
        <thead>
          <tr>
            <th>{t('thTicker')}</th>
            <th>{t('thPrice')}</th>
            <th>{t('findInspectStatus')}</th>
            <th>{t('findInspectBestScore')}</th>
            <th>{t('findInspectResilience')}</th>
            <th>{t('findInspectShares')}</th>
          </tr>
        </thead>
        <tbody>
          {#each inspectFiltered as r (r.ticker)}
            <tr class:insufficient={r.reason !== 'calculated'}>
              <td>
                <strong>{r.ticker}</strong>
                <span class="muted">{r.name}</span>
              </td>
              <td class="tabular">{fmtMoney(r.price)}</td>
              <td>
                <Badge
                  level={r.reason === 'calculated' ? 'success' : r.reason === 'no-eligibility' ? 'warning' : 'neutral'}
                  label={r.reason === 'calculated' ? t('findStatusCalculated') : r.reason === 'no-eligibility' ? t('findStatusNoEligibility') : r.reason === 'no-budget' ? t('findStatusNoBudget') : t('findStatusNoData')}
                />
              </td>
              <td class="tabular">{r.topScore !== null ? r.topScore.toFixed(1) : '—'}</td>
              <td class="tabular">{r.topResilience !== null ? `${r.topResilience}/${r.topResilienceTotal}` : '—'}</td>
              <td class="tabular">{r.topShares !== null ? fmtShares(r.topShares) : '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Modal>

<style>
  .finder {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: var(--space-6);
    align-items: start;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    position: sticky;
    top: calc(var(--top-h) + var(--space-4));
  }
  .filters h3 {
    font-size: 20px;
    margin-bottom: var(--space-2);
  }
  .fgroup {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--border);
  }
  .fgroup-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--faint);
  }
  .filters label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  .filters input,
  .filters select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    font-size: 14px;
    color: var(--text);
  }
  .avail {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
  }
  .sec-title {
    font-size: 20px;
    margin-bottom: var(--space-4);
  }
  .mode-note {
    font-size: 13px;
    color: var(--muted);
    margin: 0 0 var(--space-4);
  }
  .pv-intro {
    font-size: 14px;
    color: var(--muted);
    margin: 0 0 var(--space-4);
  }
  .pv-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  .pv-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    padding: 10px 0;
    border-top: 1px solid var(--border);
    font-size: 14px;
  }
  .pv-foot {
    font-size: 12px;
    color: var(--faint);
    margin: 0 0 var(--space-4);
  }
  .pv-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }
  .fcard {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .fc-top {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .rank {
    font-family: var(--font-display);
    font-size: 26px;
    color: var(--faint);
  }
  .fc-head {
    flex: 1;
  }
  .fc-title {
    font-weight: 700;
    font-size: 18px;
  }
  .fc-name {
    font-size: 13px;
    color: var(--muted);
  }
  .badges {
    margin: var(--space-3) 0;
  }
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }
  .kpis div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kpis span {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .kpis strong {
    font-size: 16px;
  }
  .pos {
    color: var(--success);
  }
  .neg {
    color: var(--danger);
  }
  .rationale {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0 0 var(--space-3);
  }
  .detail-list {
    list-style: none;
    margin: 0 0 var(--space-3);
    padding: 0;
  }
  .detail-list li {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-top: 1px solid var(--border);
    font-size: 14px;
  }
  :global(.rot) {
    transform: rotate(180deg);
    transition: transform 180ms ease;
  }
  .empty-note {
    font-size: 13px;
    color: var(--muted);
    margin: 0 0 var(--space-3);
    line-height: 1.5;
  }
  .inspect-btn {
    background: var(--text);
    color: var(--inverse);
    border: 0;
    border-radius: 10px;
    padding: 10px 18px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }
  .inspect-btn:hover { opacity: 0.85; }
  .inspect-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    margin-bottom: var(--space-3);
  }
  .inspect-search {
    flex: 1 1 220px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
  }
  .inspect-sort, .inspect-filter {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
  }
  .inspect-sort select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 10px;
    font-size: 12px;
  }
  .inspect-table-wrap {
    max-height: 50vh;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .inspect-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .inspect-table th, .inspect-table td {
    padding: 9px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .inspect-table th {
    background: var(--surface-2);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 700;
  }
  .inspect-table td.tabular { text-align: right; }
  .inspect-table tr.insufficient td { color: var(--muted); }
  .inspect-table .muted { color: var(--muted); font-weight: 400; margin-left: 6px; }
  .empty {
    text-align: center;
    padding: var(--space-6);
    color: var(--muted);
  }
  .empty h4 { color: var(--text); margin: 0 0 6px; }
  @media (max-width: 960px) {
    .finder {
      grid-template-columns: 1fr;
    }
    .filters {
      position: static;
    }
    .kpis {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
