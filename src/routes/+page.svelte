<script lang="ts">
  import { app } from '$lib/state/appState.svelte';
  import { settings, getActiveProfileId } from '$lib/engine/settings/settingsStore.svelte';
  import { selectAccount, topLevel } from '$lib/engine/selectors/selectAccount';

  import { fmtMoney, fmtPct, fmtNum, fmtShares } from '$lib/utils/format';
  import { SECTOR_COLORS } from '$lib/utils/colors';
  import { t } from '$lib/i18n';
  import { locale } from '$lib/i18n/state.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import KpiCard from '$lib/components/ui/KpiCard.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import ChartCard from '$lib/components/ui/ChartCard.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import Donut from '$lib/components/charts/Donut.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { sectorLabel } from '$lib/i18n/labels';

  const stats = $derived(
    selectAccount({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      profileId: getActiveProfileId(),
      settings
    })
  );

  // Combined status card: tek cümlede açılabilirlik + dayanıklılık + portföy kalitesi.
  const concThreshold = $derived(settings.collateralRisk.concentrationThreshold);
  const minCashRatio = 0.1;

  const healthProfile = $derived([
    { label: t('metricGeneral'), value: stats.health, color: 'var(--text)' },
    { label: t('metricCash'), value: Math.min(stats.cashRatio * 100, 100), color: 'var(--success)' },
    {
      label: t('metricDiversity'),
      value: Math.max(0, (1 - stats.concentration) * 100),
      color: stats.concentration > concThreshold ? 'var(--danger)' : 'var(--success)'
    },
    {
      label: t('metricBetaBalance'),
      value: Math.max(0, Math.min(100, 100 - Math.max(0, stats.weightedBeta - 1) * 100)),
      color: stats.weightedBeta > 1.6 ? 'var(--danger)' : 'var(--text)'
    }
  ]);

  const allocation = $derived(
    Object.entries(stats.sectorWeights)
      .filter(([, w]) => w > 0)
      .map(([sector, w]) => ({
        label: sectorLabel(sector),
        value: w * 100,
        color: SECTOR_COLORS[sector as keyof typeof SECTOR_COLORS] ?? 'var(--muted)'
      }))
  );

  const top = $derived(topLevel(stats.alerts));

  // Gerçek hesap-temelli buffer: equity - maintenanceReq, maintenanceReq yüzdesi olarak.
  // maintenanceReq = 0 ise buffer "tanımsız" → %1000 sentinel'i UI'da "+100% buffer" olarak işlenir.
  const realBufferPct = $derived(
    stats.collateral.maintenanceReq > 0
      ? (stats.collateral.excessLiquidity / stats.collateral.maintenanceReq) * 100
      : stats.collateral.excessLiquidity > 0
        ? 1000
        : 0
  );

  const statusKind = $derived<'available' | 'elevated' | 'blocked'>(
    stats.availableCollateral <= 0
      ? 'blocked'
      : top === 'safe' && stats.concentration <= concThreshold && stats.cashRatio >= minCashRatio
        ? 'available'
        : 'elevated'
  );
  const statusTitle = $derived(t(
    statusKind === 'available'
      ? 'pageGeneralStatusAvailable'
      : statusKind === 'blocked'
        ? 'pageGeneralStatusBlocked'
        : 'pageGeneralStatusCombined'
  ));
  const statusBody = $derived(t('pageGeneralStatusBuffer', {
    pct: fmtPct(Math.min(realBufferPct, 100), 0),
    ticker: stats.largest?.ticker ?? '—',
    conc: fmtPct((stats.largest?.weight ?? 0) * 100, 0)
  }));

  const nextActions = $derived.by(() => {
    const acts: { label: string; href: string; icon: string }[] = [];
    if (stats.concentration > concThreshold && stats.largest) {
      acts.push({ label: t('actReduceConc', { ticker: stats.largest.ticker }), href: '/portfolio', icon: 'briefcase' });
    }
    if (stats.cashRatio < minCashRatio) {
      acts.push({ label: t('actAddCash'), href: '/portfolio', icon: 'wallet' });
    }
    acts.push({ label: t('actRunScenarios'), href: '/scenarios', icon: 'waypoints' });
    if (top === 'safe') {
      acts.push({ label: t('heroCtaFinder'), href: '/finder', icon: 'scan-search' });
    }
    return acts.slice(0, 3);
  });
</script>

<PageHeader eyebrow={t('pageGeneralEyebrow')} title={t('pageGeneralTitle2')}>
  {t('pageGeneralSubtitle2')}
</PageHeader>

<GuidedNote title={t('pageGeneralGuidedTitle')}>
  {t('pageGeneralGuidedBody')}
</GuidedNote>

<div class="hero">
  <div class="hero-panel">
    <div class="eyebrow">{t('heroEyebrow')}</div>
    <h2>{t('heroTitle')}</h2>
    <p>
      {t('heroBody', {
        total: fmtMoney(stats.total),
        invested: fmtMoney(stats.totalInvested),
        cash: fmtMoney(stats.cash),
        concentration: fmtPct(stats.concentration * 100, 0)
      })}
    </p>
    <div class="hero-cta">
      <a class="btn-primary" href="/simulator"><Icon name="calculator" size={18} /> {t('heroCtaSim')}</a>
      <a class="btn-ghost" href="/finder"><Icon name="scan-search" size={18} /> {t('heroCtaFinder')}</a>
    </div>
  </div>
  <div class="hero-side">
      {@render Metric('wallet', t('metricTotalPortfolio'), fmtMoney(stats.total), t('metricHoldingsSub', { count: app.portfolio.holdings.length, cash: fmtPct(stats.cashRatio * 100, 0) }))}
    {@render Metric('shield', t('metricMarginBuffer'), fmtPct(Math.min(realBufferPct, 100), 0), t('metricMarginBufferSub'))}
    {@render Metric('pie', t('metricConcentration'), fmtPct(stats.concentration * 100, 0), t('metricLargestPos'))}
  </div>
</div>

<section class="status-card" class:elevated={statusKind === 'elevated'} class:blocked={statusKind === 'blocked'}>
  <div class="status-head">
    <Icon name={statusKind === 'available' ? 'shield-check' : statusKind === 'blocked' ? 'shield-alert' : 'alert'} size={20} />
    <h3>{statusTitle}</h3>
  </div>
  <p class="status-body">{statusBody}</p>
  <div class="now-actions">
    {#each nextActions as a (a.label)}
      <a class="now-btn" href={a.href}><Icon name={a.icon} size={16} /> {a.label}</a>
    {/each}
  </div>
</section>

<div class="kpi-grid">
  <KpiCard kind="result" label={t('kpiHealthScore')} value={`${stats.health}/100`} hint={t('kpiHintHealth', { beta: fmtNum(stats.weightedBeta, 2), cash: fmtPct(stats.cashRatio * 100, 0) })} icon="shield-check" level={top} />
  <KpiCard kind="result" label={t('kpiAvailableCollateral')} value={fmtMoney(stats.availableCollateral)} hint={t('kpiHintCashSecurities')} icon="wallet" />
  <KpiCard kind="result" label={t('kpiBuyingPower')} value={fmtMoney(stats.buyingPower)} hint={t('kpiHintInitial')} icon="trending" />
  <KpiCard kind="result" label={t('kpiLargestPosition')} value={stats.largest ? stats.largest.ticker : '—'} hint={stats.largest ? t('kpiHintLargest', { shares: fmtShares(stats.largest.shares), weight: fmtPct(stats.largest.weight * 100, 0) }) : ''} icon="briefcase" />
</div>

<div class="banner">
  {#each stats.alerts as a (a.title)}
    <WarningBox level={a.level} title={a.title} detail={a.detail} />
  {/each}
</div>

<div class="two-col">
  <ChartCard title={t('healthProfileTitle')} subtitle={stats.healthNarrative}>
    {#snippet chart()}
      <BarChart data={healthProfile} unit="" height={200} ariaLabel={t('chartHealthAria')} />
    {/snippet}
    {#snippet chartExpanded()}
      <BarChart data={healthProfile} unit="" height={360} ariaLabel={t('chartHealthAria')} />
    {/snippet}
  </ChartCard>

  <ChartCard title={t('allocTitle')}>
    {#snippet chart()}
      <Donut data={allocation} size={200} ariaLabel={t('chartSectorAria')} />
    {/snippet}
    {#snippet chartExpanded()}
      <Donut data={allocation} size={320} ariaLabel={t('chartSectorAria')} />
    {/snippet}
  </ChartCard>
</div>

{#if app.decisionLog.length > 0}
  <section class="card decisions">
    <div class="card-head">
      <h3>{t('decisionsTitle')}</h3>
      <span class="hint">{t('decisionsCount', { n: app.decisionLog.length })}</span>
    </div>
    <ul class="dec-list">
      {#each app.decisionLog as d (d.ts)}
        <li>
          <span class="dec-t">{new Date(d.ts).toLocaleString(locale.value === 'en' ? 'en-US' : 'tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          <span class="dec-main"><strong>{d.ticker} × {d.shares}</strong> @ {fmtMoney(d.price)}</span>
          <span class="dec-meta">{t('decMeta', { bufferPct: d.bufferPct.toFixed(1), resilience: d.resilience, mode: d.mode, scope: d.scope })}</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#snippet Metric(icon: string, label: string, value: string, sub: string)}
  <div class="metric">
    <div class="metric-top"><span>{label}</span><Icon name={icon} size={18} /></div>
    <div class="metric-value tabular">{value}</div>
    <div class="metric-sub">{sub}</div>
  </div>
{/snippet}

<style>
  .hero {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: var(--space-6);
    margin-bottom: var(--space-8);
  }
  .hero-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .hero-panel h2 {
    font-size: clamp(26px, 3.4vw, 38px);
    margin: var(--space-2) 0 var(--space-3);
  }
  .hero-panel p {
    color: var(--muted);
    max-width: 52ch;
    line-height: 1.55;
  }
  .hero-cta {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-6);
    flex-wrap: wrap;
  }
  .btn-primary,
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 46px;
    padding: 0 18px;
    border-radius: var(--radius-md);
    font-weight: 600;
    text-decoration: none;
  }
  .btn-primary {
    background: var(--text);
    color: var(--inverse);
  }
  .btn-ghost {
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .hero-side {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    justify-content: center;
  }
  .metric {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }
  .metric-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
  }
  .metric-value {
    font-size: 28px;
    font-weight: 700;
    margin: 6px 0 2px;
  }
  .metric-sub {
    font-size: 13px;
    color: var(--muted);
  }
  .status-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--success);
    border-radius: var(--radius-lg);
    padding: var(--space-5) var(--space-6);
    margin-bottom: var(--space-6);
  }
  .status-card.elevated {
    border-left-color: var(--warning);
  }
  .status-card.blocked {
    border-left-color: var(--danger);
  }
  .status-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }
  .status-head h3 {
    font-size: 20px;
    font-family: var(--font-display);
    font-weight: 400;
  }
  .status-body {
    color: var(--muted);
    margin: 0 0 var(--space-3);
    line-height: 1.5;
  }
  .now-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .now-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 999px;
    background: var(--text);
    color: var(--inverse);
    font-weight: 600;
    font-size: 14px;
    text-decoration: none;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
  .banner {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
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
    align-items: center;
    margin-bottom: var(--space-4);
  }
  .card-head h3 {
    font-size: 20px;
  }
  .decisions {
    margin-top: var(--space-6);
  }
  .dec-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .dec-list li {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: baseline;
    padding: 10px 0;
    border-top: 1px solid var(--border);
    font-size: 14px;
  }
  .dec-t {
    color: var(--faint);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .dec-main {
    font-weight: 600;
  }
  .dec-meta {
    color: var(--muted);
    font-size: 13px;
  }
  @media (max-width: 960px) {
    .hero,
    .two-col,
    .kpi-grid {
      grid-template-columns: 1fr;
    }
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 640px) {
    .kpi-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
