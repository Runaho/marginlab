<script lang="ts">
  import {
    app,
    setActiveScenario,
    addCustomScenario,
    newScenarioId
  } from '$lib/state/appState.svelte';
  import { settings } from '$lib/engine/settings/settingsStore.svelte';
  import { selectScenarioProjection } from '$lib/engine/selectors/selectScenarioProjection';
  import { selectMarginLabMap } from '$lib/engine/selectors/selectMarginLabMap';
  import { computeCosts, COST_LABELS } from '$lib/engine/costs';
  import { SCENARIOS } from '$lib/engine/presets';
  import { presetToSpec, userScenarioToSpec, type ScenarioInput, type UserScenario, type ScenarioSpec } from '$lib/engine/types';
  import { groupedTickerOptions, groupedTickerGroups, getInstrument, betaFor, sectorFor } from '$lib/engine/market';
  import { DEFAULT_COLLATERAL_RATE } from '$lib/engine/marginProfile';
  import { openConcept } from '$lib/state/conceptStore';
  import { t } from '$lib/i18n';
  import { marginDisclaimer, scenarioDesc, scenarioLabel, profileLabel } from '$lib/i18n/labels';
  import { fmtMoney, fmtPct } from '$lib/utils/format';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import AssumptionsChecklist from '$lib/components/ui/AssumptionsChecklist.svelte';
  import MarginLabMap from '$lib/components/MarginLabMap.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import CustomScenarioBuilder from '$lib/components/scenarios/CustomScenarioBuilder.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';

  // Trade parametreleri Simulator'dan gelir (working draft).
  const ticker = $derived(app.currentTrade?.ticker ?? 'NVDA');
  const shares = $derived(app.currentTrade?.shares ?? 3);
  const additionalCash = $derived(app.currentTrade?.additionalCash ?? 0);
  const holdingDays = $derived(app.currentTrade?.holdingDays ?? 30);

  const profileId = $derived(settings.activeProfileId);
  const annualRate = $derived(settings.costModel.annualMarginRate);

  const tickerOptions = $derived(groupedTickerOptions(app.portfolio.holdings, app.watchlist));
  const tickerGroups = $derived(groupedTickerGroups(app.portfolio.holdings, app.watchlist));

  // Mobile responsive label: see simulator/+page.svelte for rationale
  let isMobile = $state(false);
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 540px)');
    isMobile = mq.matches;
    const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  const price = $derived(getInstrument(ticker)?.price ?? 0);

  const tradeSpec = $derived.by(() => {
    const m = getInstrument(ticker);
    return {
      ticker,
      name: m?.company ?? ticker,
      shares,
      price,
      cost: price,
      beta: betaFor(ticker),
      sector: sectorFor(m?.category ?? ''),
      collateral: DEFAULT_COLLATERAL_RATE
    };
  });

  // Unified view item: preset veya custom senaryoları tek listede gösterir.
  interface ScenarioViewItem {
    kind: 'preset' | 'custom';
    /** Benzersiz kimlik; preset için 'preset:Bull', custom için 'custom:<id>'. */
    key: string;
    displayName: string;
    description: string;
    spec: ScenarioSpec;
    /** Custom ise basedOnScenarioId (preset adı); null ise sıfırdan oluşturulmuş. */
    basedOn: string | null;
    /** Custom ise kendi UserScenario kaydı (delete için). */
    customRef: UserScenario | null;
  }

  function presetToView(s: ScenarioInput): ScenarioViewItem {
    return {
      kind: 'preset',
      key: 'preset:' + s.name,
      displayName: s.name,
      description: scenarioDesc(s.name),
      spec: presetToSpec(s),
      basedOn: null,
      customRef: null
    };
  }

  function customToView(u: UserScenario): ScenarioViewItem {
    const desc =
      u.kind === 'simple'
        ? t('scenCustomSimpleDesc', { trade: fmtPct(u.tradeShock * 100, 0), portfolio: fmtPct(u.portfolioShock * 100, 0), days: u.days })
        : t('scenCustomPathDesc', { anchors: u.tradePath.length, days: u.holdingPeriod });
    return {
      kind: 'custom',
      key: 'custom:' + u.id,
      displayName: u.name,
      description: desc,
      spec: userScenarioToSpec(u),
      basedOn: u.kind === 'path' ? u.basedOnScenarioId : null,
      customRef: u
    };
  }

  const viewItems = $derived<ScenarioViewItem[]>([
    ...app.customScenarios.map(customToView),
    ...SCENARIOS.map(presetToView)
  ]);

  function projectSpec(spec: ScenarioSpec) {
    return selectScenarioProjection({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      trade: tradeSpec,
      additionalCash,
      holdingDays,
      profileId,
      settings,
      spec
    });
  }

  function classify(p: ReturnType<typeof projectSpec>): 'controlled' | 'watch' | 'fragile' | 'unknown' {
    if (p.calculationStatus === 'insufficient-data' || p.calculationStatus === 'calculation-error') return 'unknown';
    if (p.marginCallDay >= 0) return 'fragile';
    const ew = p.days.some((d) => d.day > 0 && d.riskStatus === 'early-warning');
    return ew ? 'watch' : 'controlled';
  }

  const results = $derived(
    viewItems.map((v) => {
      const p = projectSpec(v.spec);
      return { item: v, projection: p, verdict: classify(p) };
    })
  );

  // Aktif senaryo belirleme: hem preset adı hem custom id ile eşleşebilir.
  const active = $derived.by(() => {
    if (app.activeCustomScenarioId) {
      const m = results.find((r) => r.item.kind === 'custom' && r.item.customRef?.id === app.activeCustomScenarioId);
      if (m) return m;
    }
    const m = results.find((r) => r.item.kind === 'preset' && r.item.displayName === app.activeScenario);
    return m ?? results[0];
  });

  const matrix = $derived(
    selectMarginLabMap({ cash: app.portfolio.cash, holdings: app.portfolio.holdings, trade: tradeSpec, additionalCash, profileId, settings })
  );

  // Compute costs — aktif senaryonun holdingPeriod'unu kullan (custom path veya preset days).
  const activeHoldingDays = $derived.by(() => {
    const v = active.item;
    return v.spec.kind === 'flat' ? v.spec.days : v.spec.holdingPeriod;
  });

  const costs = $derived(
    computeCosts({
      shares,
      price,
      borrow: active.projection.days[0]?.debitBalance ?? 0,
      holdingDays: activeHoldingDays,
      rate: annualRate,
      costModel: settings.costModel
    })
  );

  const resilience = $derived.by(() => {
    const c = { controlled: 0, watch: 0, fragile: 0, unknown: 0 };
    for (const x of results) c[x.verdict]++;
    return c;
  });

  const verdictLabel = (v: string) =>
    v === 'controlled'
      ? t('verdictControlled')
      : v === 'watch'
        ? t('verdictWatch')
        : v === 'fragile'
          ? t('verdictFragile')
          : t('verdictUnknown');

  const verdictLevel = (v: string) =>
    v === 'controlled' ? 'success' : v === 'watch' ? 'warning' : v === 'fragile' ? 'danger' : 'neutral';

  let showDaily = $state(false);

  const ewPct = $derived(settings.accountProfiles[profileId].earlyWarningBufferRate * 100);

  const chartPoints = $derived(
    active.projection.days.map((d) => ({
      x: d.day,
      y: isFinite(d.bufferPct) ? Math.max(-50, Math.min(100, d.bufferPct)) : 0,
      marker: d.riskStatus === 'margin-call'
    }))
  );

  function statusText(p: ReturnType<typeof projectSpec>): string {
    if (p.calculationStatus === 'insufficient-data') return t('scenStatusInsufficientData');
    if (p.calculationStatus === 'calculation-error') return t('scenStatusCalculationError');
    if (p.calculationStatus === 'no-margin-call-within-horizon') return t('scenStatusNoMcHorizon');
    return p.marginCallDay > 0 ? t('scenMcDayCalculated', { day: p.marginCallDay }) : t('scenStatusNoMcHorizon');
  }

  function cardWhy(p: ReturnType<typeof projectSpec>): string {
    const minB = p.minBufferPct;
    const ew = settings.scenarioEngine.riskThresholds.earlyWarningBufferRate * 100;
    if (p.calculationStatus === 'insufficient-data') return t('scenStatusInsufficientData');
    if (p.calculationStatus === 'calculation-error') return t('scenStatusCalculationError');
    if (p.marginCallDay > 0) {
      return t('scenMcDayCalculated', { day: p.marginCallDay });
    }
    if (minB !== null && minB < ew) {
      const dist = Math.max(0, ew - minB);
      return t('scenCardDistanceToEw', { points: dist.toFixed(0) });
    }
    if (minB !== null) return t('scenCardMinBuffer', { pct: minB.toFixed(0) });
    return t('scenStatusNoMcHorizon');
  }

  function cardSubtitle(v: ScenarioViewItem): string {
    if (v.kind === 'preset') {
      const flat = v.spec as Extract<ScenarioSpec, { kind: 'flat' }>;
      return t('scenCardShock', { trade: fmtPct(flat.tradeShock * 100, 0), portfolio: fmtPct(flat.portfolioShock * 100, 0) });
    }
    return v.description;
  }

  function displayLabel(v: ScenarioViewItem): string {
    return v.kind === 'preset' ? scenarioLabel(v.displayName) : v.displayName;
  }

  function selectItem(v: ScenarioViewItem) {
    if (v.kind === 'preset') {
      setActiveScenario(v.displayName);
      app.activeCustomScenarioId = null;
    } else {
      app.activeCustomScenarioId = v.customRef?.id ?? null;
      setActiveScenario('Peak');
    }
  }

  function duplicatePresetAsCustom(s: ScenarioInput) {
    // Custom scenario'yu "path" kind'ında oluştur (preset'ten duplicate edildi).
    const id = newScenarioId();
    const now = new Date().toISOString();
    const tradePath = flatToPath(s.tradeShock, s.days, s.dailyDrop);
    const portfolioPath = flatToPath(s.portfolioShock, s.days, s.dailyDrop);
    const newCustom: UserScenario = {
      id,
      kind: 'path',
      name: `${s.name}${t('simCustomSuffix')}`,
      basedOnScenarioId: s.name,
      tradePath,
      portfolioPath,
      interpolation: 'linear',
      holdingPeriod: s.days,
      createdAt: now,
      updatedAt: now,
      settingsVersion: '2'
    };
    addCustomScenario(newCustom);
    app.activeCustomScenarioId = id;
    setActiveScenario('Peak');
  }

  /**
   * Preset senaryoyu path anchor listesine çevirir.
   * dailyDrop != 0 ise: day 0 = 0, day = days = dailyDrop * days son nokta (compound yerine direkt toplam etki).
   * dailyDrop == 0 ise: ani şok — day 0 = 0, day 1 = tradeShock, day = days = tradeShock (step).
   */
  function flatToPath(shock: number, days: number, dailyDrop: number): { day: number; changePct: number }[] {
    if (dailyDrop !== 0) {
      const endPct = Math.pow(1 + dailyDrop, days) - 1;
      return [
        { day: 0, changePct: 0 },
        { day: days, changePct: endPct }
      ];
    }
    return [
      { day: 0, changePct: 0 },
      { day: 1, changePct: shock },
      { day: days, changePct: shock }
    ];
  }
</script>

<PageHeader eyebrow={t('scenEyebrow')} title={t('scenTitle')} desc={t('scenDesc')} />

<GuidedNote title={t('scenGuidedTitle')}>
  {t('scenGuidedBody')}
</GuidedNote>

<section class="trade-bar card">
  <span class="lbl">{t('scenTestTrade')}</span>
  <select value={ticker} disabled aria-label={t('scenTestTrade')}>
    {#each tickerGroups as g (g.key)}
      <optgroup label={g.label}>
        {#each g.options as opt (opt.ticker)}
          <option value={opt.ticker}>{isMobile ? opt.ticker : `${opt.ticker} — ${opt.name}${opt.group === 'portfolio' && opt.shares ? t('simOwnedNote', { shares: opt.shares, weight: ((opt.weight ?? 0) * 100).toFixed(0) }) : ''}${opt.group === 'watchlist' ? ` · ${t('navWatchlist')}` : ''}`}</option>
        {/each}
      </optgroup>
    {/each}
  </select>
  <label>{t('lblShares')}<input type="number" min="1" value={shares} readonly aria-readonly="true" /></label>
  <label>{t('simExtraCashLabel')}<input type="number" min="0" step="0.01" value={additionalCash} readonly aria-readonly="true" /></label>
  <span class="hint">@ {fmtMoney(price)}</span>
  <a class="edit-link" href="/simulator">{t('simEditOnSimulator')} →</a>
</section>

<div class="resilience" aria-live="polite">
  <span class="rs-label">{t('scenResilience')}</span>
  <Badge kind="alert" level="success" label={`${resilience.controlled} ${t('verdictControlled')}`} />
  <Badge kind="alert" level="warning" label={`${resilience.watch} ${t('verdictWatch')}`} />
  <Badge kind="alert" level="danger" label={`${resilience.fragile} ${t('verdictFragile')}`} />
  <span class="rs-note">{t('scenResilienceNote', { count: results.length, safe: resilience.controlled })}</span>
</div>

<div class="cards">
  {#each results as x (x.item.key)}
    {@const isActive = x.item.kind === 'preset'
      ? x.item.displayName === app.activeScenario && !app.activeCustomScenarioId
      : x.item.customRef?.id === app.activeCustomScenarioId}
    <div class="scard" class:active={isActive}>
      <button class="scard-main" type="button" onclick={() => selectItem(x.item)} aria-pressed={isActive}>
        <div class="sc-top">
          <span class="sc-name">
            {#if x.item.kind === 'custom'}
              <Icon name="shield-check" size={12} /> {x.item.displayName}
            {:else}
              {scenarioLabel(x.item.displayName)}
            {/if}
          </span>
          <Badge level={verdictLevel(x.verdict)} label={verdictLabel(x.verdict)} />
        </div>
        <div class="sc-shock">{cardSubtitle(x.item)}</div>
        <div class="sc-pl tabular">{statusText(x.projection)}</div>
        <div class="sc-why">{t('scenCardWhy')}: {cardWhy(x.projection)}</div>
      </button>
      {#if x.item.kind === 'preset'}
        {@const flatSpec = x.item.spec.kind === 'flat' ? x.item.spec : null}
        {#if flatSpec}
          <button
            type="button"
            class="dup"
            aria-label={t('simDuplicateAria', { name: x.item.displayName })}
            title={t('simDuplicateTitle')}
            onclick={() => duplicatePresetAsCustom({
              name: x.item.displayName,
              description: x.item.description,
              tradeShock: flatSpec.tradeShock,
              portfolioShock: flatSpec.portfolioShock,
              dailyDrop: flatSpec.dailyDrop,
              days: flatSpec.days
            })}
          >
            <Icon name="plus" size={12} /> {t('simDuplicate')}
          </button>
        {/if}
      {/if}
    </div>
  {/each}
</div>

<CustomScenarioBuilder />

<p class="role-sep">{t('scenResilienceIntro')}</p>

<section class="card stress">
  <div class="card-head">
    <h3>{t('scenStressTitle', { name: displayLabel(active.item) })}</h3>
    <Badge
      level={verdictLevel(active.verdict)}
      label={verdictLabel(active.verdict)}
    />
  </div>
  <p class="desc">{active.item.description} {t('scenStressDesc')}</p>
  <div class="pt-grid">
    <div class="pt"><span>{t('scenPostShockValue')}</span><strong class="tabular">{fmtMoney(active.projection.days[active.projection.days.length - 1]?.portfolioValue ?? 0)}</strong></div>
    <div class="pt"><span>{t('simNewMaint')}</span><strong class="tabular">{fmtMoney(active.projection.days[active.projection.days.length - 1]?.maintenanceReq ?? 0)}</strong></div>
    <div class="pt"><span>{t('simMcDayLabel')}</span><strong class="tabular" class:neg={active.projection.marginCallDay >= 0}>{statusText(active.projection)}</strong></div>
  </div>

  {#if active.projection.days.length > 0}
    <LineChart points={chartPoints} threshold={0} earlyWarning={ewPct} height={260} yMin={-50} yMax={100} xLabel={t('unitDay')} ariaLabel={t('chartTimeSeries')} />
  {/if}

  <button class="toggle-daily" type="button" onclick={() => (showDaily = !showDaily)}>
    {showDaily ? t('scenHideDaily') : t('scenShowDaily')}
  </button>

  {#if showDaily}
    <table class="stress-table">
      <thead>
        <tr><th>{t('scenDay')}</th><th>{t('thValue')}</th><th>{t('scenStatus')}</th></tr>
      </thead>
      <tbody>
        {#each active.projection.days as d (d.day)}
          <tr class:mc={d.riskStatus === 'margin-call'}>
            <td>{d.day}</td>
            <td class="tabular">{fmtMoney(d.portfolioValue)}</td>
            <td>
              {d.riskStatus === 'margin-call'
                ? t('scenDayMc')
                : d.riskStatus === 'maintenance-risk'
                  ? t('scenDayMr')
                  : d.riskStatus === 'early-warning'
                    ? t('scenDayEw')
                    : t('scenDayOk')}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<section class="card detail">
  <div class="card-head">
    <h3>{t('scenDetailTitle', { name: displayLabel(active.item) })}</h3>
    <Badge level={verdictLevel(active.verdict)} label={verdictLabel(active.verdict)} />
  </div>
  <p class="desc">{active.item.description}</p>

  <div class="split">
    <div class="split-box">
      <div class="sb-label">{t('simEwDayLabel')}</div>
      <div class="sb-val tabular">
        {active.projection.calculationStatus === 'insufficient-data'
          ? t('scenDayInsuff')
          : active.projection.earlyWarningDay < 0
            ? t('scenStatusNoMcHorizon')
            : active.projection.earlyWarningDay}
      </div>
      <div class="sb-sub">{t('scenEwSub', { pct: ewPct.toFixed(0) })}</div>
    </div>
    <div class="split-box">
      <div class="sb-label">{t('simEstInterestDays', { days: activeHoldingDays })}</div>
      <div class="sb-val tabular" class:neg={costs.total > 0}>{fmtMoney(costs.total)}</div>
      <div class="sb-sub">
        {#each Object.entries(costs).filter(([k]) => k !== 'total') as [k, v] (k)}
          {COST_LABELS[k as keyof typeof COST_LABELS]}: {fmtMoney(v as number)}{/each}
      </div>
    </div>
  </div>

  <WarningBox level={verdictLevel(active.verdict)} title={verdictLabel(active.verdict)} detail={active.item.displayName === 'Flat' ? t('scenFlatNote') : active.verdict === 'fragile' ? t('scenFragileNote') : active.verdict === 'watch' ? t('scenWatchNote') : t('scenSafeNote')} />
  <AssumptionsChecklist />
  <p class="profile-note">{t('simProfileNote', { name: profileLabel(profileId) })}. {marginDisclaimer()}</p>
</section>

<MarginLabMap projection={active.projection} matrix={matrix} />

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
  .edit-link {
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px dashed var(--border);
  }
  .edit-link:hover { color: var(--text); border-color: var(--text); }
  .trade-bar select:disabled,
  .trade-bar input[readonly] {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .resilience {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .rs-label {
    font-weight: 700;
    font-size: 14px;
  }
  .rs-note {
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
    position: relative;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    transition: border-color 180ms ease, transform 180ms var(--ease);
  }
  .scard:hover { transform: translateY(-2px); }
  .scard.active {
    border-color: var(--text);
    box-shadow: inset 0 0 0 1px var(--text);
  }
  .scard-main {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    background: transparent;
    border: none;
    padding: var(--space-4);
    cursor: pointer;
    text-align: left;
    color: inherit;
  }
  .scard.active .scard-main { color: inherit; }
  .dup {
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 3px 7px;
    font-size: 10px;
    color: var(--muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    opacity: 0;
    transition: opacity 150ms;
  }
  .scard:hover .dup, .scard:focus-within .dup { opacity: 1; }
  .dup:hover { color: var(--text); border-color: var(--text); }
  .sc-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sc-name {
    font-family: var(--font-display);
    font-size: 19px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .sc-shock {
    font-size: 12px;
    color: var(--muted);
  }
  .sc-pl {
    font-size: 13px;
    font-weight: 600;
  }
  .sc-why {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.4;
  }
  .role-sep {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0 0 var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }
  .toggle-daily {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-top: var(--space-3);
  }
  .toggle-daily:hover {
    background: var(--surface-2);
  }
  .detail .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }
  .stress {
    margin-bottom: var(--space-6);
  }
  .pt-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .pt {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pt span {
    font-size: 12px;
    color: var(--muted);
  }
  .pt strong {
    font-size: 18px;
  }
  .stress-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: var(--space-2);
  }
  .stress-table th {
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--faint);
    padding: 0 12px 8px;
    font-weight: 600;
  }
  .stress-table th:nth-child(2),
  .stress-table th:nth-child(3) {
    text-align: right;
  }
  .stress-table td {
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    font-size: 13px;
  }
  .stress-table td.tabular {
    text-align: right;
  }
  .stress-table tr.mc td {
    color: var(--danger);
    font-weight: 700;
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
  .neg {
    color: var(--danger);
  }
  .profile-note {
    font-size: 12px;
    color: var(--faint);
    margin: var(--space-2) 0 0;
    line-height: 1.4;
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