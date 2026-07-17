<script lang="ts">
  import { app, addHolding, removeHolding, setCash, setAccount, loadPortfolio, toggleWatchlist, isInWatchlist, setHoldingCollateral, resetHoldingCollateral, toggleExcludeCollateral, updateHolding } from '$lib/state/appState.svelte';
  import { settings, getActiveProfileId } from '$lib/engine/settings/settingsStore.svelte';
  import { selectAccount, enrichHoldings } from '$lib/engine/selectors/selectAccount';
  import { resolveProfile } from '$lib/engine/account/settingsResolver';
  import { readPortfolioFile, downloadPortfolio } from '$lib/engine/portfolioIO';
  import { openConcept } from '$lib/state/conceptStore';
  import { SECTORS, DEFAULT_PORTFOLIO } from '$lib/engine/presets';
  import { MARKET, getMarket, betaFor, sectorFor } from '$lib/engine/market';
  import { DEFAULT_COLLATERAL_RATE } from '$lib/engine/marginProfile';
  import type { Holding, Sector } from '$lib/engine/types';
  import { fmtMoney, fmtPct, fmtShares, fmtNum } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import { conceptTitle, sectorLabel, profileLabel } from '$lib/i18n/labels';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import CollateralBadge from '$lib/components/ui/CollateralBadge.svelte';
  import ProfileSelector from '$lib/components/ui/ProfileSelector.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  const stats = $derived(
    selectAccount({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      profileId: getActiveProfileId(),
      settings
    })
  );
  const enriched = $derived(
    enrichHoldings({
      holdings: app.portfolio.holdings,
      profileId: getActiveProfileId(),
      settings
    })
  );
  const profile = $derived(resolveProfile(settings, getActiveProfileId()));
  const analytics = $derived({
    totalValue: stats.total,
    cashRatio: stats.cashRatio,
    weightDistribution: Object.fromEntries(
      app.portfolio.holdings.map((h) => [h.ticker, stats.sectorWeights[h.sector] ?? 0])
    ),
    concentrationRisk: {
      current: stats.concentration,
      maxPosition: stats.largest?.ticker ?? '',
      flag: stats.concentrationFlag
    },
    sectorExposure: stats.sectorWeights,
    buyingPower: stats.buyingPower,
    maintenanceCoverage: stats.collateral.maintenanceReq > 0
      ? stats.netLiquidationValue / stats.collateral.maintenanceReq
      : 0,
    marginUtilization: stats.collateral.totalCollateral > 0
      ? (stats.collateral.existingInitialReq / stats.collateral.totalCollateral) * 100
      : 0
  });

  let editCollateral = $state(false);

  let newH = $state<Holding>({
    ticker: '',
    name: '',
    shares: 1,
    price: 0,
    cost: 0,
    beta: 1,
    collateral: DEFAULT_COLLATERAL_RATE,
    collateralSource: 'default-assumption',
    sector: 'Teknoloji'
  });

  let fileError = $state('');
  let fileInput: HTMLInputElement;

  let watchAdd = $state('');
  const portfolioTickers = $derived(new Set(app.portfolio.holdings.map((h) => h.ticker)));
  const watchlistView = $derived(
    app.watchlist.map((w) => ({
      ticker: w.ticker,
      name: getMarket(w.ticker)?.company ?? w.ticker,
      inPortfolio: portfolioTickers.has(w.ticker)
    }))
  );
  const addableToWatch = $derived(MARKET.filter((m) => !app.watchlist.some((w) => w.ticker === m.ticker)));

  function doAddWatch(t: string) {
    if (!t) return;
    toggleWatchlist(t);
    watchAdd = '';
  }

  function riskLevel(weight: number): 'safe' | 'warning' | 'danger' {
    if (weight > 0.4) return 'danger';
    if (weight > 0.3) return 'warning';
    return 'safe';
  }

  const hasUserOverride = $derived(app.portfolio.holdings.some((h) => h.collateralSource === 'user-override' || h.excludeFromCollateral));

  // Yoğunlaşma haircut simülasyonu — yalnızca kullanıcı onayıyla en yoğun pozisyonun oranını düşürür
  function simulateHaircut() {
    if (!stats.largest) return;
    const idx = app.portfolio.holdings.findIndex((h) => h.ticker === stats.largest!.ticker);
    if (idx < 0) return;
    const current = app.portfolio.holdings[idx].collateral;
    const reduced = Math.max(0, Math.round((current - 0.25) * 100) / 100);
    const ok = confirm(
      t('portHaircutConfirm', { ticker: stats.largest.ticker, from: Math.round(current * 100).toString(), to: Math.round(reduced * 100).toString() })
    );
    if (ok) setHoldingCollateral(idx, reduced);
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    fileError = '';
    try {
      const data = await readPortfolioFile(file);
      loadPortfolio(data);
    } catch (err) {
      fileError = err instanceof Error ? err.message : t('portFileError');
    }
    input.value = '';
  }

  function addPos() {
    if (!newH.ticker || newH.price <= 0 || newH.shares <= 0) return;
    addHolding({ ...newH, name: newH.name || newH.ticker });
    newH = { ticker: '', name: '', shares: 1, price: 0, cost: 0, beta: 1, collateral: DEFAULT_COLLATERAL_RATE, collateralSource: 'default-assumption', sector: 'Teknoloji' };
  }

  function pickMarketTicker(t: string) {
    const m = getMarket(t);
    if (!m) return;
    newH.ticker = t;
    newH.name = m.company;
    newH.price = m.price;
    newH.cost = m.price;
    newH.beta = betaFor(t);
    newH.sector = sectorFor(m.category);
  }

  /** Sector explorer (empty state) ile quick-add formu arasinda kopru */
  let pickSector = $state<string>('');
  function prefillFromMarket(ticker: string) {
    pickMarketTicker(ticker);
    // Formu gorunur kalmaya zorla (details.add.quick zaten open)
  }

  // Onboarding modal for first-time visitors
  let showOnboarding = $state(false);

  onMount(() => {
    if (!browser) return;
    const onboarded = localStorage.getItem('mc-onboarded');
    if (!onboarded) {
      showOnboarding = true;
    }
  });

  function completeOnboarding(loadDemo: boolean) {
    if (loadDemo) {
      loadPortfolio(structuredClone(DEFAULT_PORTFOLIO));
    }
    if (browser) {
      localStorage.setItem('mc-onboarded', 'true');
    }
    showOnboarding = false;
  }

  function clearAll() {
    const ok = confirm(t('portClearConfirm'));
    if (ok) {
      // app.portfolio.account Svelte 5 proxy; structuredClone burada patlar (DataCloneError).
      // loadPortfolio zaten JSON ile deep-clone yapıyor — plain object geçirmek yeterli.
      loadPortfolio({ cash: 0, account: { ...app.portfolio.account }, holdings: [] });
    }
  }

  const concepts = [
    { key: 'collateral' },
    { key: 'concentration' },
    { key: 'initial' },
    { key: 'maintenance' }
  ];
</script>

<PageHeader eyebrow={t('navWorkspace')} title={t('navPortfolio')} desc={t('portDesc')} />

<!-- Onboarding Modal -->
<Modal open={showOnboarding} title={t('portOnboardTitle')} eyebrow="Hoş geldin" onclose={() => completeOnboarding(false)} wide>
  <div class="onboard">
    <p class="onboard-desc">{t('portOnboardDesc')}</p>
    <div class="onboard-actions">
      <Button variant="secondary" icon="download" onclick={() => completeOnboarding(false)}>
        {t('portOnboardEmpty')}
      </Button>
      <Button icon="sparkles" onclick={() => completeOnboarding(true)}>
        {t('portOnboardDemo')}
      </Button>
    </div>
    <p class="onboard-note">{t('portOnboardEmptyDesc')}</p>
  </div>
</Modal>

<GuidedNote title={t('portCollateralGuideTitle')}>
  {t('portCollateralGuideBody')}
</GuidedNote>

<div class="toolbar">
  <Button icon="upload" variant="secondary" onclick={() => fileInput.click()}>{t('portLoadJson')}</Button>
  <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={onFile} hidden />
  <Button icon="download" variant="secondary" onclick={() => downloadPortfolio(app.portfolio)}>{t('portExportJson')}</Button>
  <Button variant="ghost" icon="trash" onclick={clearAll} class="clear-btn">{t('portClearTitle')}</Button>
</div>
{#if fileError}<div class="err">{fileError}</div>{/if}

<div class="grid">
  {#if app.portfolio.holdings.length === 0}
    <section class="card empty-rich">
      <!-- Empty workspace — bigger, asymmetric-healing, mimics table-card density -->
      <div class="empty-rich-head">
        <div class="empty-rich-icon"><Icon name="briefcase" size={28} /></div>
        <div>
          <h2>{t('portEmptyTitle')}</h2>
          <p class="empty-rich-sub">{t('portEmptyRichSub')}</p>
        </div>
      </div>

      <ol class="empty-steps">
        <li>
          <span class="step-num">1</span>
          <div>
            <strong>{t('portEmptyStep1Title')}</strong>
            <p>{t('portEmptyStep1Body')}</p>
          </div>
        </li>
        <li>
          <span class="step-num">2</span>
          <div>
            <strong>{t('portEmptyStep2Title')}</strong>
            <p>{t('portEmptyStep2Body')}</p>
          </div>
        </li>
        <li>
          <span class="step-num">3</span>
          <div>
            <strong>{t('portEmptyStep3Title')}</strong>
            <p>{t('portEmptyStep3Body')}</p>
          </div>
        </li>
      </ol>

      <div class="empty-rich-cta">
        <details class="add quick" open>
          <summary><Icon name="plus" size={16} /> {t('portQuickAdd')}</summary>
          <div class="form">
            <p class="auto-pool-note">{t('portAutoPoolNote')}</p>
            <div class="form-section">
              <div class="form-grid">
                <label>{t('lblTicker')}
                  <select value={newH.ticker} onchange={(e) => pickMarketTicker((e.currentTarget as HTMLSelectElement).value)}>
                    <option value="">{t('commonSelect')}</option>
                    {#each MARKET as m}<option value={m.ticker}>{m.ticker} — {m.company}</option>{/each}
                  </select>
                </label>
                <label>{t('lblShares')}<input type="number" min="1" bind:value={newH.shares} /></label>
                <label>{t('lblPrice')}<input type="number" min="0" step="0.01" bind:value={newH.price} /></label>
              </div>
            </div>
            <div class="form-actions">
              <Button icon="plus" onclick={addPos}>{t('commonAdd')}</Button>
              <Button variant="secondary" icon="download" onclick={() => loadPortfolio(structuredClone(DEFAULT_PORTFOLIO))}>{t('portEmptyDemo')}</Button>
            </div>
          </div>
        </details>
      </div>

      <details class="add advanced">
        <summary><Icon name="sliders" size={14} /> {t('portAdvancedFields')}</summary>
        <div class="form-grid">
          <label>{t('lblName')}<input bind:value={newH.name} placeholder={t('portFormNamePlaceholder')} /></label>
          <label>{t('lblCost')}<input type="number" min="0" step="0.01" bind:value={newH.cost} /></label>
          <label>{t('lblBeta')}<input type="number" step="0.1" bind:value={newH.beta} /></label>
          <label>{t('lblCollateralPct')}<input type="number" min="0" max="100" step="1" value={Math.round((newH.collateral ?? 0) * 100)} oninput={(e) => newH.collateral = (parseFloat((e.currentTarget as HTMLInputElement).value) || 0) / 100} /></label>
          <label>{t('lblSector')}
            <select bind:value={newH.sector}>
              {#each SECTORS as s}<option value={s}>{sectorLabel(s)}</option>{/each}
            </select>
          </label>
        </div>
      </details>
    </section>
  {/if}
  {#if app.portfolio.holdings.length > 0}
  <section class="card table-card">
    <div class="card-head">
      <h3>{t('portPositions', { count: app.portfolio.holdings.length })}</h3>
    </div>
    <div class="coll-breakdown">
      <div class="cb-item">
        <span class="cb-k">{t('simCashCollateral')}</span>
        <span class="cb-v tabular">{fmtMoney(stats.collateral.cashCollateral)}</span>
      </div>
      <span class="cb-op">+</span>
      <div class="cb-item">
        <span class="cb-k">{t('simSecurityCollateral')}</span>
        <span class="cb-v tabular">{fmtMoney(stats.collateral.securitiesCollateral)}</span>
      </div>
      <span class="cb-op">=</span>
      <div class="cb-item total">
        <span class="cb-k">{t('simTotalCollateral')}</span>
        <span class="cb-v tabular">{fmtMoney(stats.collateral.totalCollateral)}</span>
      </div>
      <span class="cb-profile">{profileLabel(profile.id)}</span>
    </div>

    {#if profile.collateralMode === 'cash-only'}
      <p class="adv-note">
        {t('portAdvNoSec', { profile: profileLabel(profile.id) })}
      </p>
    {/if}
    <label class="adv-toggle">
      <input type="checkbox" bind:checked={editCollateral} />
      <span>{t('portAdvToggle')}</span>
    </label>
    {#if editCollateral}
      <p class="adv-note">
        {t('portAdvEditBody', { rate: Math.round(DEFAULT_COLLATERAL_RATE * 100).toString() })}
      </p>
    {:else}
      <p class="adv-note">
        {t('portAdvNote')}
      </p>
    {/if}
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t('thAsset')}</th>
            <th>{t('thShares')}</th>
            <th>{t('thPrice')}</th>
            <th>{t('thValue')}</th>
            <th>{t('thWeight')}</th>
            <th>{t('thPL')}</th>
            <th>{t('thCollateralRate')}</th>
            <th>{t('thEffCollateral')}</th>
            <th>{t('thRisk')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each enriched as h, i (h.ticker + i)}
            <tr>
              <td data-label={t('thAsset')}>
                {#each [getMarket(h.ticker)] as m}
                  <div class="tk">{h.ticker}</div>
                  <div class="tk-name">{h.name}</div>
                  {#if m}
                    <span class="chg" class:up={m.changePercent1D >= 0} class:down={m.changePercent1D < 0}>
                      {m.changePercent1D >= 0 ? '▲' : '▼'} {Math.abs(m.changePercent1D).toFixed(2)}%
                    </span>
                  {/if}
                {/each}
              </td>
              <td data-label={t('thShares')}><input class="cell" type="number" min="0" step="1" value={app.portfolio.holdings[i].shares} oninput={(e) => updateHolding(i, { shares: Math.max(0, Math.floor(parseFloat((e.currentTarget as HTMLInputElement).value) || 0)) })} /></td>
              <td data-label={t('thPrice')}><input class="cell" type="number" min="0" step="0.01" value={app.portfolio.holdings[i].price} oninput={(e) => updateHolding(i, { price: Math.max(0, parseFloat((e.currentTarget as HTMLInputElement).value) || 0) })} /></td>
              <td data-label={t('thValue')} class="tabular">{fmtMoney(h.value)}</td>
              <td data-label={t('thWeight')} class="tabular">{fmtPct(h.weight * 100, 0)}</td>
              <td data-label={t('thPL')} class="tabular" class:neg={h.pl < 0} class:pos={h.pl > 0}>{fmtMoney(h.pl, { sign: true })}</td>
               <td data-label={t('thCollateralRate')}>
                <div class="coll-cell">
                  <input class="cell narrow" type="number" min="0" max="100" step="1" disabled={!editCollateral || app.portfolio.holdings[i].excludeFromCollateral} class:locked={!editCollateral} value={Math.round((app.portfolio.holdings[i].collateral ?? 0) * 100)} oninput={(e) => setHoldingCollateral(i, (parseFloat((e.currentTarget as HTMLInputElement).value) || 0) / 100)} />
                  <CollateralBadge source={h.resolvedSource} rate={h.collateral} />
                  {#if editCollateral}
                    <button class="coll-x" class:active={app.portfolio.holdings[i].excludeFromCollateral} onclick={() => toggleExcludeCollateral(i)} title={app.portfolio.holdings[i].excludeFromCollateral ? t('portIncludeTitle') : t('portExcludeTitle')}>{app.portfolio.holdings[i].excludeFromCollateral ? t('portIncludeTitle') : t('portExcludeTitle')}</button>
                    {#if h.resolvedSource === 'user-override' || app.portfolio.holdings[i].excludeFromCollateral}
                      <button class="coll-reset" onclick={() => resetHoldingCollateral(i)} title={t('commonRevertDefaults')}>↺</button>
                    {/if}
                  {/if}
                </div>
              </td>
              <td data-label={t('thEffCollateral')} class="tabular">{fmtMoney(h.effectiveValue)}</td>
              <td data-label={t('thRisk')}><Badge level={riskLevel(h.weight)} label={riskLevel(h.weight) === 'danger' ? t('riskConcentrated') : riskLevel(h.weight) === 'warning' ? t('riskWatch') : t('riskBalanced')} /></td>
              <td><button class="rm" onclick={() => removeHolding(i)} aria-label={t('rowDelete')}><Icon name="x" size={16} /></button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if hasUserOverride}
      <div class="warn-row">
        <WarningBox level="warning" title={t('portSimAssumptionTitle')} detail={t('portSimAssumptionDetail')} />
      </div>
    {/if}

    {#if stats.concentrationFlag}
      <div class="warn-row">
        <WarningBox level="danger" title={t('portConcTitle')} detail={t('portConcDetail', { ticker: stats.largest?.ticker ?? '', pct: (stats.concentration * 100).toFixed(0) })}>
          {#snippet actions()}
            <a href="/portfolio"><Icon name="briefcase" size={14} /> {t('portReducePos')}</a>
            <a href="/scenarios"><Icon name="waypoints" size={14} /> {t('portTestScenarios')}</a>
            <button onclick={simulateHaircut}><Icon name="sliders" size={14} /> {t('portSimHaircut')}</button>
          {/snippet}
        </WarningBox>
      </div>
    {:else if stats.cashRatio < 0.1}
      <div class="warn-row">
        <WarningBox level="warning" title={t('portCashLowTitle')} detail={t('portCashLowDetail')}>
          {#snippet actions()}
            <a href="/portfolio"><Icon name="wallet" size={14} /> {t('actAddCash')}</a>
            <a href="/scenarios"><Icon name="waypoints" size={14} /> {t('portTestScenarios')}</a>
          {/snippet}
        </WarningBox>
      </div>
    {/if}

    <details class="add">
      <summary><Icon name="plus" size={16} /> {t('portAddPosition')}</summary>
      <div class="form">
        <p class="auto-pool-note">{t('portAutoPoolNote')}</p>

        <div class="form-section">
          <h4>{t('portQuickAdd')}</h4>
          <div class="form-grid">
            <label>{t('lblTicker')}
              <select value={newH.ticker} onchange={(e) => pickMarketTicker((e.currentTarget as HTMLSelectElement).value)}>
                <option value="">{t('commonSelect')}</option>
                {#each MARKET as m}<option value={m.ticker}>{m.ticker} — {m.company}</option>{/each}
              </select>
            </label>
            <label>{t('lblShares')}<input type="number" min="1" bind:value={newH.shares} /></label>
            <label>{t('lblPrice')}<input type="number" min="0" step="0.01" bind:value={newH.price} /></label>
          </div>
        </div>

        <details class="form-advanced">
          <summary><Icon name="sliders" size={14} /> {t('portAdvancedFields')}</summary>
          <div class="form-grid">
            <label>{t('lblName')}<input bind:value={newH.name} placeholder={t('portFormNamePlaceholder')} /></label>
            <label>{t('lblCost')}<input type="number" min="0" step="0.01" bind:value={newH.cost} /></label>
            <label>{t('lblBeta')}<input type="number" step="0.1" bind:value={newH.beta} /></label>
            <label>{t('lblCollateralPct')}<input type="number" min="0" max="100" step="1" value={Math.round((newH.collateral ?? 0) * 100)} oninput={(e) => newH.collateral = (parseFloat((e.currentTarget as HTMLInputElement).value) || 0) / 100} /></label>
            <label>{t('lblSector')}
              <select bind:value={newH.sector}>
                {#each SECTORS as s}<option value={s}>{sectorLabel(s)}</option>{/each}
              </select>
            </label>
          </div>
        </details>

        <div class="form-actions">
          <Button icon="plus" onclick={addPos}>{t('commonAdd')}</Button>
        </div>
      </div>
    </details>
  </section>
  {/if}

  <aside class="card stats-panel">
    {#if app.portfolio.holdings.length === 0}
      <!-- Empty mode: sector explorer -->
      <div class="card-head"><h3>{t('portSectorExplorerTitle')}</h3></div>
      <p class="acct-hint">{t('portSectorExplorerSub')}</p>
      <label class="acct" style="margin-top:var(--space-3)">{t('portPickSector')}
        <select bind:value={pickSector}>
          <option value="">{t('commonSelect')}</option>
          {#each SECTORS as s}
            <option value={s}>{sectorLabel(s)}</option>
          {/each}
        </select>
      </label>
      {#if pickSector}
        {@const sectorStocks = MARKET.filter((m) => sectorFor(m.category) === pickSector).slice(0, 5)}
        <p class="an-note" style="margin-top:var(--space-4)">{t('portPopularIn')} {sectorLabel(pickSector)}</p>
        <ul class="sector-pills">
          {#each sectorStocks as m (m.ticker)}
            <li>
              <button type="button" class="sector-pill" onclick={() => prefillFromMarket(m.ticker)}>
                <strong>{m.ticker}</strong>
                <span class="sector-pill-company">{m.company}</span>
              </button>
            </li>
          {/each}
        </ul>
        <p class="acct-hint" style="margin-top:var(--space-3)">{t('portTipAdd')}</p>
      {/if}
    {:else}
      <!-- Live mode: portfolio stats -->
      <div class="card-head"><h3>{t('portAnalytics')}</h3></div>
      <div class="analytics">
        <div class="an-row"><span>{t('kpiBuyingPower')}</span><span class="tabular">{fmtMoney(analytics.buyingPower)}</span></div>
        <div class="an-row"><span>{t('portMaintCoverage')}</span><span class="tabular">{fmtNum(analytics.maintenanceCoverage)}×</span></div>
        <div class="an-row"><span>{t('portMarginUsage')}</span><span class="tabular" class:neg={analytics.marginUtilization > 0.8}>{fmtPct(analytics.marginUtilization * 100, 0)}</span></div>
        <div class="an-row"><span>{t('metricConcentration')}</span><span class="tabular">{analytics.concentrationRisk.flag ? '⚠ ' : ''}{fmtPct(analytics.concentrationRisk.current * 100, 0)} · {analytics.concentrationRisk.maxPosition}</span></div>
      </div>
      <p class="an-note">{t('portSectorExposure')}</p>
      <ul class="an-sectors">
        {#each Object.entries(analytics.sectorExposure) as [sector, w] (sector)}
          <li><span>{sectorLabel(sector)}</span><span class="tabular">{fmtPct((w ?? 0) * 100, 0)}</span></li>
        {/each}
      </ul>
    {/if}
  </aside>

  <aside class="card guide">
    <div class="card-head"><h3>{t('portAccountProfile')}</h3></div>
    <ProfileSelector />

    <div class="card-head" style="margin-top:var(--space-6)"><h3>{t('portAccountSettings')}</h3></div>
    <label class="acct">{t('portCashCollateralUsd')}
      <input type="number" min="0" step="0.01" value={app.portfolio.cash} oninput={(e) => setCash(Math.max(0, parseFloat((e.currentTarget as HTMLInputElement).value) || 0))} />
    </label>
    <p class="acct-hint">
      {t('portAccountSettingsHint')}
      <a href="/settings">{t('navSettings')}</a>
    </p>

    <div class="card-head" style="margin-top:var(--space-6)"><h3>{t('navWatchlist')}</h3></div>
    <p class="wl-note">{t('portWatchlistNote')}</p>
    <label class="acct">{t('portAddTicker')}
      <select bind:value={watchAdd} onchange={(e) => doAddWatch((e.currentTarget as HTMLSelectElement).value)}>
        <option value="">{t('commonSelect')}</option>
        {#each addableToWatch as m (m.ticker)}<option value={m.ticker}>{m.ticker} — {m.company}</option>{/each}
      </select>
    </label>
    {#if watchlistView.length > 0}
      <ul class="wl-list">
        {#each watchlistView as w (w.ticker)}
          <li>
            <span class="wl-tk">{w.ticker}</span>
            <span class="wl-name">{w.name}{w.inPortfolio ? ` · ${t('wlInPortfolio')}` : ''}</span>
            <button class="wl-rm" onclick={() => toggleWatchlist(w.ticker)} aria-label={t('portWatchRemove', { ticker: w.ticker })}><Icon name="x" size={14} /></button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="wl-empty">{t('portWatchEmpty')}</p>
    {/if}

    <div class="card-head" style="margin-top:var(--space-6)"><h3>{t('portConceptGuide')}</h3></div>
    <ul class="concepts">
      {#each concepts as c (c.key)}
        <li><button onclick={() => openConcept(c.key)}><Icon name="info" size={16} /> {conceptTitle(c.key)}</button></li>
      {/each}
    </ul>
  </aside>
</div>

<style>
  .toolbar {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: var(--space-4);
  }
  .reset {
    font-size: 13px;
    color: var(--muted);
    text-decoration: underline;
    cursor: pointer;
    margin-left: auto;
  }
  .err {
    color: var(--danger);
    font-size: 14px;
    margin-bottom: var(--space-3);
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px 280px;
    gap: var(--space-6);
    align-items: start;
    max-width: 1400px;
    margin: 0 auto;
  }
  .grid.single-column {
    grid-template-columns: minmax(0, 1fr);
  }
  @media (max-width: 1440px) {
    .grid { grid-template-columns: minmax(0, 1fr) 320px; }
    .grid > .stats-panel { display: none; }
  }
  @media (max-width: 960px) {
    .grid { grid-template-columns: minmax(0, 1fr) !important; }
    .grid > .stats-panel, .grid > .guide { display: none; }
  }

  .stats-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .sector-pills {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sector-pill {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 10px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: border-color 120ms ease;
  }
  .sector-pill:hover { border-color: var(--text); }
  .sector-pill strong { font-size: 13px; font-weight: 700; flex-shrink: 0; }
  .sector-pill-company {
    color: var(--muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--space-4);
    gap: var(--space-3);
  }
  .card-head h3 {
    font-size: 20px;
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead th {
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--faint);
    padding: 0 12px 10px;
    font-weight: 600;
  }
  /* Sayısal kolon başlıkları sağa hizalı: Değer, Ağırlık, P/L, Efektif teminat */
  thead th:nth-child(4),
  thead th:nth-child(5),
  thead th:nth-child(6),
  thead th:nth-child(8) {
    text-align: right;
  }
  tbody td {
    padding: 12px;
    border-top: 1px solid var(--border);
    font-size: 14px;
    vertical-align: middle;
  }
  tbody td.tabular {
    text-align: right;
  }
  tbody tr {
    transition: background 120ms ease;
  }
  tbody tr:hover {
    background: var(--surface-2);
  }
  tbody tr:focus-within {
    background: var(--surface-2);
    outline: 2px solid var(--text);
    outline-offset: -2px;
    border-radius: 8px;
  }
  .tk {
    font-weight: 700;
  }
  .tk-name {
    font-size: 12px;
    color: var(--muted);
  }
  .chg {
    display: inline-block;
    margin-top: 3px;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .chg.up {
    color: var(--success);
  }
  .chg.down {
    color: var(--danger);
  }
  .cell {
    width: 78px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 13px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .cell.narrow {
    width: 58px;
  }
  .cell.locked {
    opacity: 0.55;
    background: var(--surface-3);
    cursor: not-allowed;
  }
  .adv-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: var(--space-2);
    cursor: pointer;
  }
  .adv-note {
    font-size: 12px;
    color: var(--faint);
    margin: 0 0 var(--space-3);
    line-height: 1.45;
  }
  .coll-breakdown {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-4);
  }
  .cb-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cb-k {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--faint);
    font-weight: 600;
  }
  .cb-v {
    font-size: 16px;
    font-weight: 700;
  }
  .cb-item.total .cb-v {
    color: var(--text);
  }
  .cb-op {
    font-size: 18px;
    color: var(--faint);
    font-weight: 700;
  }
  .cb-profile {
    margin-left: auto;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 3px 10px;
  }
  .coll-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .coll-reset {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    min-width: 24px;
    height: 24px;
    cursor: pointer;
    color: var(--muted);
    font-size: 14px;
    line-height: 1;
  }
  .coll-reset:hover {
    color: var(--text);
    border-color: var(--text);
  }
  .coll-x {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    min-height: 24px;
    padding: 2px 8px;
    cursor: pointer;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
  }
  .coll-x:hover {
    color: var(--text);
    border-color: var(--text);
  }
  .coll-x.active {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 40%, var(--border));
  }
  .pos {
    color: var(--success);
  }
  .neg {
    color: var(--danger);
  }
  .rm {
    background: transparent;
    border: none;
    color: var(--faint);
    cursor: pointer;
  }
  .rm:hover {
    color: var(--danger);
  }
  .warn-row {
    margin-top: var(--space-4);
  }
  .add {
    margin-top: var(--space-6);
    border-top: 1px solid var(--border);
    padding-top: var(--space-4);
  }
  .add summary {
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    list-style: none;
  }
  .add summary::-webkit-details-marker {
    display: none;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }
  .auto-pool-note {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
    padding: var(--space-2) var(--space-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .form-section h4 {
    font-family: var(--font-display);
    font-size: 16px;
    margin: 0 0 var(--space-2);
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }
  .form-advanced {
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }
  .form-advanced > summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    list-style: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .form-advanced > summary::-webkit-details-marker { display: none; }
  .form label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  .form input,
  .form select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    font-size: 14px;
    color: var(--text);
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
  }
  .guide {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .empty {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: flex-start;
  }
  .empty h3 {
    font-size: 22px;
  }
  .empty p {
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
    max-width: 60ch;
  }
  .empty-actions {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    margin-top: var(--space-2);
  }

  /* Empty-state-as-workspace: yatay asimetriyi iyilestiren zengin kart */
  .empty-rich {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 92%, transparent) 0%,
      var(--surface) 60%
    );
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-7);
  }
  .empty-rich-head {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
  }
  .empty-rich-icon {
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--text) 8%, transparent);
    color: var(--text);
    flex-shrink: 0;
  }
  .empty-rich-head h2 {
    font-family: var(--font-display);
    font-size: 28px;
    line-height: 1.15;
    margin: 0 0 var(--space-2);
  }
  .empty-rich-sub {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.55;
    max-width: 56ch;
  }
  .empty-steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
    counter-reset: step;
  }
  .empty-steps li {
    display: flex;
    gap: var(--space-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }
  .step-num {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: var(--text);
    color: var(--inverse);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 13px;
    flex-shrink: 0;
  }
  .empty-steps strong {
    font-size: 14px;
    display: block;
    margin-bottom: 4px;
  }
  .empty-steps p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .empty-rich-cta {
    border-top: 1px dashed var(--border);
    padding-top: var(--space-5);
  }
  .empty-rich-cta .form-section h4 { display: none; }
  .empty-rich-cta .form-grid {
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--space-3);
  }
  .empty-rich-cta .form-actions {
    justify-content: flex-start;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  .add.advanced {
    margin-top: var(--space-3);
    border-top: 1px dashed var(--border);
    padding-top: var(--space-4);
  }
  @media (max-width: 720px) {
    .empty-steps { grid-template-columns: 1fr; }
    .empty-rich-cta .form-grid { grid-template-columns: 1fr 1fr; }
  }
  .acct {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  .acct input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    font-size: 14px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .analytics {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
  }
  .an-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: 13px;
  }
  .an-row span:first-child {
    color: var(--muted);
  }
  .an-note {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--faint);
    font-weight: 600;
    margin: var(--space-2) 0 0;
  }
  .an-sectors {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .an-sectors li {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    gap: var(--space-3);
  }
  .wl-note {
    font-size: 12px;
    color: var(--faint);
    margin: 0 0 var(--space-2);
    line-height: 1.45;
  }
  .wl-list {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .wl-list li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    font-size: 13px;
  }
  .wl-tk {
    font-weight: 700;
  }
  .wl-name {
    flex: 1;
    color: var(--muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .wl-rm {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: var(--faint);
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .wl-rm:hover {
    color: var(--danger);
  }
  .wl-empty {
    font-size: 13px;
    color: var(--faint);
    margin: var(--space-2) 0 0;
  }
  .concepts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .concepts button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
    color: var(--text);
    font-weight: 600;
    font-size: 14px;
    text-align: left;
  }
  .concepts button:hover {
    border-color: var(--text);
  }
  @media (max-width: 960px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .form {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 640px) {
    .table-scroll {
      overflow-x: visible;
    }
    thead {
      display: none;
    }
    tbody td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-3);
      border: none;
      padding: 5px 0;
      text-align: right;
    }
    tbody td.tabular {
      text-align: right;
    }
    tbody td::before {
      content: attr(data-label);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--faint);
      font-weight: 600;
      text-align: left;
    }
    /* Her pozisyon bir kart */
    tbody tr {
      display: block;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      margin-bottom: var(--space-3);
    }
    tbody tr:hover,
    tbody tr:focus-within {
      background: var(--surface-2);
      outline: none;
    }
    /* Sembol satırını öne çıkar */
    tbody td:first-child {
      display: block;
      text-align: left;
      padding-bottom: var(--space-2);
      margin-bottom: var(--space-2);
      border-bottom: 1px solid var(--border);
    }
    tbody td:first-child::before {
      display: none;
    }
    .coll-cell {
      justify-content: flex-end;
    }
    .form {
        grid-template-columns: 1fr;
      }
    }

  .onboard {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    align-items: stretch;
  }
  .onboard-desc {
    color: var(--muted);
    line-height: 1.6;
    margin: 0;
  }
  .onboard-actions {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    justify-content: center;
  }
  .onboard-note {
    font-size: 13px;
    color: var(--faint);
    text-align: center;
    margin: 0;
  }
  .clear-btn {
    margin-left: auto;
  }
</style>
