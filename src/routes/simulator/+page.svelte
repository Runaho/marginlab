<script lang="ts">
  import { app, setCurrentTrade, clearCurrentTrade } from '$lib/state/appState.svelte';
  import { settings, updateSettings } from '$lib/engine/settings/settingsStore.svelte';
  import { selectTradeImpact } from '$lib/engine/selectors/selectTradeImpact';
  import { selectScenarioProjection } from '$lib/engine/selectors/selectScenarioProjection';
  import { selectMarginLabMap } from '$lib/engine/selectors/selectMarginLabMap';
  import { computeCosts, COST_LABELS } from '$lib/engine/costs';
  import { SCENARIOS } from '$lib/engine/presets';
  import { presetToSpec } from '$lib/engine/types';
  import { groupedTickerOptions, groupedTickerGroups, getInstrument, betaFor, sectorFor } from '$lib/engine/market';
  import { DEFAULT_COLLATERAL_RATE } from '$lib/engine/marginProfile';
  import { openConcept } from '$lib/state/conceptStore';
  import { t } from '$lib/i18n';
  import { conceptTitle, marginDisclaimer, profileLabel } from '$lib/i18n/labels';
  import { fmtMoney, fmtPct } from '$lib/utils/format';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import RangeSlider from '$lib/components/ui/RangeSlider.svelte';
  import ChartCard from '$lib/components/ui/ChartCard.svelte';
  import AssumptionsChecklist from '$lib/components/ui/AssumptionsChecklist.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import MarginLabMap from '$lib/components/MarginLabMap.svelte';

  const profileId = $derived(settings.activeProfileId);
  const initialMargin = $derived(settings.accountProfiles[profileId].initialMarginRate);
  const maintenanceMargin = $derived(settings.accountProfiles[profileId].maintenanceMarginRate);
  const annualRate = $derived(settings.costModel.annualMarginRate);
  // Phase 2: profil değeri tek kaynak — scenarioEngine.riskThresholds.earlyWarningBufferRate
  // artık classifyRisk tarafından okunmuyor; profilin değeri kullanılıyor.
  const ewPct = $derived(settings.accountProfiles[profileId].earlyWarningBufferRate * 100);

  let ticker = $state(app.currentTrade?.ticker ?? 'NVDA');
  let price = $state(getInstrument(app.currentTrade?.ticker ?? 'NVDA')?.price ?? 0);
  let shares = $state(app.currentTrade?.shares ?? 3);
  let additionalCash = $state(app.currentTrade?.additionalCash ?? 0);
  let holdingDays = $state(app.currentTrade?.holdingDays ?? 30);

  const tickerOptions = $derived(groupedTickerOptions(app.portfolio.holdings, app.watchlist));
  const tickerGroups = $derived(groupedTickerGroups(app.portfolio.holdings, app.watchlist));

  const selectedInfo = $derived.by(() => {
    const m = getInstrument(ticker);
    const owned = app.portfolio.holdings.find((h) => h.ticker === ticker);
    const watched = app.watchlist.some((w) => w.ticker === ticker);
    return { market: m, owned, watched };
  });

  function pickTicker(t: string) {
    ticker = t;
    const opt = tickerOptions.find((o) => o.ticker === t);
    const p = opt?.price ?? getInstrument(t)?.price ?? 0;
    price = p;
  }

  // Working draft: input değişimleri app.currentTrade'a yazılır → Scenarios +
  // DecisionStrip + MarginLabMap aynı taslaktan okur. localStorage senkronu
  // syncStorage üzerinden ayrı bir $effect'te (250ms debounce) tetiklenir.
  $effect(() => {
    setCurrentTrade({
      ticker,
      shares,
      additionalCash,
      holdingDays,
      updatedAt: new Date().toISOString()
    });
  });

  function clearTrade() {
    clearCurrentTrade();
    ticker = 'NVDA';
    price = getInstrument('NVDA')?.price ?? 0;
    shares = 3;
    additionalCash = 0;
    holdingDays = 30;
  }

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

  const impact = $derived(
    selectTradeImpact({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      trade: tradeSpec,
      additionalCash,
      holdingDays,
      profileId,
      settings
    })
  );

  const activeScenario = $derived<(typeof SCENARIOS)[number]>(
    SCENARIOS.find((s) => s.name === app.activeScenario) ?? SCENARIOS[0]
  );

  const projection = $derived(
    selectScenarioProjection({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      trade: tradeSpec,
      additionalCash,
      holdingDays,
      profileId,
      settings,
      spec: presetToSpec(activeScenario)
    })
  );

  const marginLabMap = $derived(
    selectMarginLabMap({ cash: app.portfolio.cash, holdings: app.portfolio.holdings, trade: tradeSpec, additionalCash, profileId, settings })
  );

  const costs = $derived(
    computeCosts({ shares, price, borrow: impact.ledger.estimatedDebitBalance, holdingDays, rate: annualRate, costModel: settings.costModel })
  );

  const ewPrice = $derived(price * (1 - settings.accountProfiles[profileId].earlyWarningBufferRate));
  const ewDay = $derived(projection.days.find((d) => d.day > 0 && d.riskStatus === 'early-warning')?.day ?? -1);
  const mcDay = $derived(projection.marginCallDay);

  const alertLevel = $derived(
    !impact.canOpen
      ? 'danger'
      : impact.buffer <= 0
        ? 'danger'
        : impact.buffer < ewPct
          ? 'warning'
          : 'success'
  );

  const postTrade = $derived(projection.days[0]);

  const primaryCta = $derived.by(() => {
    if (!impact.canOpen) return { label: t('simCtaFindLot'), href: '#trade' };
    if (alertLevel === 'success') return { label: t('simCtaValidate'), href: '/scenarios' };
    if (alertLevel === 'warning') return { label: t('simCtaTestResilience'), href: '#map' };
    return { label: t('simCtaCompare'), href: '/portfolio' };
  });

  function setInitial(v: number) {
    updateSettings((s) => {
      s.accountProfiles[s.activeProfileId].initialMarginRate = v;
    });
  }
  function setMaint(v: number) {
    updateSettings((s) => {
      s.accountProfiles[s.activeProfileId].maintenanceMarginRate = v;
    });
  }
  function setRate(v: number) {
    updateSettings((s) => {
      s.costModel.annualMarginRate = v;
    });
  }
</script>

<PageHeader eyebrow={t('simEyebrow')} title={t('simTitle')} desc={t('simDesc')} />

<GuidedNote title={t('simGuidedTitle')}>
  {t('simGuidedBody')}
</GuidedNote>

<div class="sim">
  <section class="card inputs" id="trade">
    <h3>{t('simStepInput')}</h3>
    <label>{t('simTickerLabel')}
      <select value={ticker} onchange={(e) => pickTicker((e.currentTarget as HTMLSelectElement).value)}>
        {#each tickerGroups as g (g.key)}
          <optgroup label={g.label}>
            {#each g.options as opt (opt.ticker)}
              <option value={opt.ticker}>
                {opt.ticker} — {opt.name}{opt.group === 'portfolio' && opt.shares ? t('simOwnedNote', { shares: opt.shares, weight: ((opt.weight ?? 0) * 100).toFixed(0) }) : ''}{opt.group === 'watchlist' ? ` · ${t('navWatchlist')}` : ''}
              </option>
            {/each}
          </optgroup>
        {/each}
      </select>
    </label>
    <p class="ticker-meta">
      {#if selectedInfo.market}
        <span class="tm-cat">{selectedInfo.market.category}</span>
        <span class="tm-sep">·</span>
        <span>{fmtMoney(selectedInfo.market.price)}</span>
      {:else}
        <span class="tm-cat">{t('simNoMarket')}</span>
      {/if}
      {#if selectedInfo.owned}
        <span class="tm-sep">·</span>
        <span class="tm-own">{t('wlInPortfolio')} · {t('simOwnedAdet', { shares: selectedInfo.owned.shares })}</span>
      {:else if selectedInfo.watched}
        <span class="tm-sep">·</span>
        <span class="tm-watch">{t('navWatchlist')}</span>
      {/if}
    </p>
    <div class="row">
      <label>{t('simPriceLabel')}<input type="number" min="0" step="0.01" bind:value={price} /></label>
      <label>{t('simSharesLabel')}<input type="number" min="1" bind:value={shares} /></label>
    </div>
    <div class="row">
      <label>{t('simExtraCashLabel')}
        <input type="number" min="0" step="0.01" bind:value={additionalCash} />
        <span class="micro">{t('simExtraCashHint')}</span>
      </label>
    </div>
    <div class="row">
      <RangeSlider label={t('simInitMargin')} min={0.1} max={0.9} step={0.05} value={initialMargin} oninput={setInitial} format={(v) => fmtPct(v * 100, 0)} defaultValue={0.5} />
      <RangeSlider label={t('simMaintMargin')} min={0.1} max={0.5} step={0.05} value={maintenanceMargin} oninput={setMaint} format={(v) => fmtPct(v * 100, 0)} defaultValue={0.25} />
    </div>
    <RangeSlider label={t('simAnnualRate')} min={0} max={0.2} step={0.005} value={annualRate} oninput={setRate} format={(v) => fmtPct(v * 100, 1)} defaultValue={0.08} />
    <RangeSlider label={t('simHoldingPeriod')} min={1} max={365} step={1} value={holdingDays} oninput={(v) => (holdingDays = v)} format={(v) => `${v} ${t('unitDays')}`} unit={t('unitDays')} defaultValue={30} />

    <div class="concept-row">
      <button class="clink" onclick={() => openConcept('callprice')}><Icon name="info" size={14} /> {conceptTitle('callprice')}</button>
      <button class="clink" onclick={() => openConcept('buffer')}><Icon name="info" size={14} /> {conceptTitle('buffer')}</button>
      <button class="clink" onclick={() => openConcept('carry')}><Icon name="info" size={14} /> {conceptTitle('carry')}</button>
      <button class="clink clink-clear" type="button" onclick={clearTrade}>
        <Icon name="plus" size={14} /> {t('simClearTrade')}
      </button>
    </div>
  </section>

  <section class="card results" aria-live="polite">
    <h3>{t('simStepCalc')}</h3>

    <!-- Layer 1: Karar -->
    <div class="layer layer-decision">
      <div class="layer-head">
        <span class="layer-num">1</span>
        <div class="layer-title">
          <strong>{t('simLayerDecision')}</strong>
          <span class="layer-body">{t('simLayerDecisionBody')}</span>
        </div>
      </div>
      {#if impact.canOpen}
        <WarningBox level={alertLevel === 'success' ? 'success' : 'warning'} title={`${t('simInitMet')}${alertLevel === 'warning' ? t('simThinBuffer') : ''}`} detail={impact.decisionRationale} />
      {:else}
        <WarningBox level="danger" title={t('simInitNotMet')} detail={impact.decisionRationale} />
      {/if}
      <a class="primary-cta" href={primaryCta.href}>{primaryCta.label}</a>
      {#if !impact.canOpen}
        <div class="sup-action">
          <p class="sup-action-note">{t('simMissingCash', { value: fmtMoney(Math.abs(impact.availableInitialAfter)) })}</p>
          <div class="sup-action-row">
            <button type="button" class="action-btn" onclick={() => (shares = Math.max(1, shares - 1))}>
              {t('simActionReduceLot')}
            </button>
            <button
              type="button"
              class="action-btn"
              onclick={() => (additionalCash = additionalCash + Math.abs(impact.availableInitialAfter))}
            >
              {t('simActionAddCash', { value: fmtMoney(Math.abs(impact.availableInitialAfter)) })}
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Layer 2: Trade etkisi -->
    <div class="layer">
      <div class="layer-head">
        <span class="layer-num">2</span>
        <div class="layer-title">
          <strong>{t('simLayerTrade')}</strong>
          <span class="layer-body">{t('simLayerTradeBody')}</span>
        </div>
      </div>
      <div class="res-grid">
        <div class="res"><span>{t('simTradeValue')}</span><strong class="tabular">{fmtMoney(impact.tradeValue)}</strong></div>
        <div class="res"><span class="link" role="button" tabindex="0" onclick={() => openConcept('initial')} onkeydown={(e) => e.key === 'Enter' && openConcept('initial')}>{t('simReqInitial')}</span><strong class="tabular">{fmtMoney(impact.requiredInitialMargin)}</strong></div>
        <div class="res"><span class="link" role="button" tabindex="0" onclick={() => openConcept('collateral')} onkeydown={(e) => e.key === 'Enter' && openConcept('collateral')}>{t('simEstDebit')}</span><strong class="tabular">{fmtMoney(impact.ledger.estimatedDebitBalance)}</strong></div>
        <div class="res"><span class="link" role="button" tabindex="0" onclick={() => openConcept('buffer')} onkeydown={(e) => e.key === 'Enter' && openConcept('buffer')}>{t('simPostBuffer')}</span><strong class="tabular">{fmtPct(impact.buffer, 1)}</strong></div>
        <div class="res"><span>{t('simEwPrice')}</span><strong class="tabular">{fmtMoney(ewPrice)}</strong></div>
        <div class="res"><span>{t('simMcPrice')}</span><strong class="tabular">{fmtMoney(impact.callPrice)}</strong></div>
      </div>

      <details class="costs">
        <summary>{t('simCashDebtEffect')}</summary>
        <ul>
          <li><span>{t('simCashBefore')}</span><span class="tabular">{fmtMoney(impact.ledger.cashBefore)}</span></li>
          <li><span>{t('simExtraCashPaid')}</span><span class="tabular">{fmtMoney(impact.ledger.additionalCash)}</span></li>
          <li><span>{t('simEstBuy')}</span><span class="tabular">{fmtMoney(impact.ledger.tradeMarketValue)}</span></li>
          <li><span>{t('simEstOpenCost')}</span><span class="tabular">{fmtMoney(impact.ledger.openingCosts)}</span></li>
          <li><span>{t('simCashAfter')}</span><span class="tabular">{fmtMoney(impact.ledger.cashAfter)}</span></li>
          <li><span>{t('simEstDebit')}</span><span class="tabular">{fmtMoney(impact.ledger.estimatedDebitBalance)}</span></li>
          <li><span>{t('simDailyInterest')}</span><span class="tabular">{fmtMoney(impact.dailyInterest)}</span></li>
          <li class="tot"><span>{t('simEstInterestDays', { days: holdingDays })}</span><span class="tabular">{fmtMoney(impact.totalInterest)}</span></li>
        </ul>
        <p class="micro">{impact.ledgerNote}</p>
      </details>

      <details class="costs">
        <summary>{t('simCostBreakdown', { days: holdingDays })}</summary>
        <ul>
          {#each Object.keys(COST_LABELS) as k (k)}
            {@const key = k as keyof typeof costs}
            {#if k !== 'total'}
              <li><span>{COST_LABELS[key]}</span><span class="tabular">{fmtMoney(costs[key])}</span></li>
            {/if}
          {/each}
          <li class="tot"><span>{COST_LABELS.total}</span><span class="tabular">{fmtMoney(costs.total)}</span></li>
        </ul>
        <p class="micro">{t('simCostThresholdNote')}</p>
      </details>
    </div>

    <!-- Layer 3: Hesap desteği -->
    <div class="layer">
      <div class="layer-head">
        <span class="layer-num">3</span>
        <div class="layer-title">
          <strong>{t('simLayerSupport')}</strong>
          <span class="layer-body">{t('simLayerSupportBody')}</span>
        </div>
      </div>
      <div class="sup-body">
        <div class="sup-row">
          <span>{t('simCashCollateral')}</span>
          <span class="tabular">{fmtMoney(impact.cashCollateral)} × %100 = <strong>{fmtMoney(impact.cashCollateral)}</strong></span>
        </div>
        <div class="sup-group">{t('simSecurityCollateral')}</div>
        {#each impact.collateral.perHolding as h (h.ticker)}
          <div class="sup-row" class:muted={h.effectiveValue === 0}>
            <span>{h.ticker}</span>
            <span class="tabular">
              {fmtMoney(h.value)} × %{Math.round(h.effectiveRate * 100)} = <strong>{fmtMoney(h.effectiveValue)}</strong>
              {#if !h.eligible}<span class="sup-flag">({(h.source === 'unknown' ? t('collFlagUnverified') : t('collFlagNotEligible'))})</span>{/if}
            </span>
          </div>
        {/each}
        <div class="sup-total">
          <div class="sup-row big"><span>{t('simTotalPool')}</span><span class="tabular"><strong>{fmtMoney(impact.totalCollateralPool)}</strong></span></div>
          <details class="sup-breakdown">
            <summary class="sup-row">
              <span>{t('simExistingLabel')}</span>
              <span class="tabular">{fmtMoney(impact.existingInitialReq)}</span>
            </summary>
            <ul class="sup-break-list">
              <li><span>{t('simExistingMaintReq')}</span><span class="tabular">{fmtMoney(impact.collateral.maintenanceReq)}</span></li>
              <li><span>{t('simExistingInitReserve')}</span><span class="tabular">{fmtMoney(impact.existingInitialReq)}</span></li>
              <li><span>{t('simExistingOpenDebt')}</span><span class="tabular">{fmtMoney(impact.ledger.estimatedDebitBalance)}</span></li>
              <li><span>{t('simExistingAccrued')}</span><span class="tabular">{fmtMoney(impact.totalInterest)}</span></li>
            </ul>
          </details>
          <div class="sup-row"><span>{t('simNewTradeInit')}</span><span class="tabular">{fmtMoney(impact.requiredInitialMargin)}</span></div>
          <div class="sup-row big"><span>{t('simPostAvailable')}</span><span class="tabular" class:neg={impact.availableInitialAfter < 0}><strong>{fmtMoney(impact.availableInitialAfter)}</strong></span></div>
          <div class="sup-row"><span>{t('simPoolMarketShare')}</span><span class="tabular">{fmtPct(impact.collateral.pctMarketDependent * 100, 0)}</span></div>
        </div>
        <p class="sup-risk">{t('simPoolRisk')}</p>
      </div>
    </div>

    <!-- Layer 4: Dayanıklılık -->
    <div class="layer">
      <div class="layer-head">
        <span class="layer-num">4</span>
        <div class="layer-title">
          <strong>{t('simLayerResilience')}</strong>
          <span class="layer-body">{t('simLayerResilienceBody')}</span>
        </div>
      </div>
      <div class="res-grid">
        <div class="res"><span>{t('simEwDayLabel')}</span><strong class="tabular">{projection.calculationStatus === 'insufficient-data' ? t('scenStatusInsufficientData') : ewDay < 0 ? t('scenStatusNoMcHorizon') : ewDay}</strong></div>
        <div class="res"><span>{t('simMcDayLabel')}</span><strong class="tabular">{projection.calculationStatus === 'insufficient-data' ? t('scenStatusInsufficientData') : mcDay < 0 ? t('scenStatusNoMcHorizon') : mcDay}</strong></div>
        <div class="res"><span>{t('simEwPrice')}</span><strong class="tabular">{fmtMoney(ewPrice)}</strong></div>
        <div class="res"><span>{t('simMcPrice')}</span><strong class="tabular">{fmtMoney(impact.callPrice)}</strong></div>
      </div>
    </div>

    <AssumptionsChecklist />
    <p class="profile-note">{t('simProfileNote', { name: profileLabel(profileId) })}. {marginDisclaimer()}</p>
  </section>
</div>

<div id="map">
<MarginLabMap {projection} matrix={marginLabMap} />
</div>

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
  .ticker-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--muted);
    margin: -8px 0 var(--space-3);
  }
  .ticker-meta .tm-sep { color: var(--faint); }
  .ticker-meta .tm-own { font-weight: 700; color: var(--text); }
  .ticker-meta .tm-watch { font-weight: 600; }
  .ticker-meta .tm-cat { font-weight: 600; }
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
  .clink-clear {
    color: var(--text);
    border-color: var(--text);
    margin-left: auto;
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
  .res span { font-size: 12px; color: var(--muted); }
  .res span.link {
    cursor: pointer;
    text-decoration: underline dotted;
    text-underline-offset: 2px;
  }
  .res span.link:hover { color: var(--text); }
  .res strong { font-size: 18px; }
  .primary-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--text);
    color: var(--inverse);
    border-radius: 10px;
    padding: 11px 18px;
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    margin: var(--space-2) 0 var(--space-4);
    transition: opacity 0.15s ease;
  }
  .primary-cta:hover { opacity: 0.85; }
  .layer {
    border-top: 1px solid var(--border);
    padding-top: var(--space-4);
    margin-top: var(--space-4);
  }
  .layer:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
  .layer-head {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }
  .layer-num {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--text);
    color: var(--inverse);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 13px;
    flex-shrink: 0;
  }
  .layer-title { display: flex; flex-direction: column; gap: 2px; }
  .layer-title strong {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 18px;
    color: var(--text);
  }
  .layer-body {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.4;
  }
  .layer-decision { background: var(--surface-2); padding: var(--space-4); border-radius: var(--radius-md); border-top: 0; margin-top: 0; }
  .sup-breakdown {
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-3);
  }
  .sup-breakdown summary {
    list-style: none;
    cursor: pointer;
    padding: 8px 12px;
  }
  .sup-breakdown summary::-webkit-details-marker { display: none; }
  .sup-breakdown summary:hover { background: var(--surface-2); }
  .sup-breakdown[open] summary { border-bottom: 1px solid var(--border); }
  .sup-breakdown summary.sup-row { padding: 0; }
  .sup-break-list {
    list-style: none;
    margin: 0;
    padding: 8px 12px;
    display: grid;
    gap: 4px;
  }
  .sup-break-list li {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--muted);
  }
  .sup-action {
    margin-top: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--danger);
    border-radius: 10px;
    background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  }
  .sup-action-note {
    margin: 0 0 var(--space-2);
    font-size: 13px;
    color: var(--text);
    line-height: 1.5;
  }
  .sup-action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .action-btn {
    background: var(--surface);
    border: 1px solid var(--text);
    color: var(--text);
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .action-btn:hover {
    background: var(--text);
    color: var(--inverse);
  }
  .profile-note {
    font-size: 12px;
    color: var(--faint);
    margin: var(--space-2) 0 0;
    line-height: 1.4;
  }
  .sup-body {
    margin-top: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sup-group {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--faint);
    font-weight: 700;
    margin-top: var(--space-2);
  }
  .sup-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: 13px;
    padding: 3px 0;
  }
  .sup-row.muted { color: var(--faint); }
  .sup-flag { color: var(--warning); font-size: 11px; }
  .sup-total {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sup-row.big { font-size: 14px; font-weight: 600; }
  .sup-risk {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
    margin: var(--space-3) 0 0;
    padding: var(--space-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .neg { color: var(--danger); }
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
  .costs li.tot { font-weight: 700; border-top: 2px solid var(--border); margin-top: 4px; }
  @media (max-width: 960px) {
    .sim { grid-template-columns: 1fr; }
  }
  @media (max-width: 540px) {
    .res-grid { grid-template-columns: 1fr !important; }
    .form-grid { grid-template-columns: 1fr !important; }
    .hdr-grid { grid-template-columns: 1fr; }
    .trade { flex-direction: column; align-items: stretch; }
    .inputs select, .inputs input { width: 100%; max-width: 100%; }
    .inputs { padding: var(--space-4); }
  }
</style>
