<script lang="ts">
  import { settings } from '$lib/engine/settings/settingsStore.svelte';
  import { app } from '$lib/state/appState.svelte';
  import type { ScenarioProjection, ShockMatrix } from '$lib/engine/account/scenarioEngine';
  import { fmtMoney, fmtPct } from '$lib/utils/format';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import ChartCard from '$lib/components/ui/ChartCard.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { t } from '$lib/i18n';
  import { riskStatusLabel } from '$lib/i18n/labels';
  import type { RiskStatus } from '$lib/engine/account/riskThresholdEngine';

  let { projection, matrix }: { projection: ScenarioProjection; matrix: ShockMatrix } = $props();

  let view = $state<'timeline' | 'matrix'>('timeline');
  let selected = $state<{ ts: number; ps: number } | null>(null);
  let hasAutoSelected = $state(false);

  const profileId = $derived(settings.activeProfileId);
  const ewPct = $derived(settings.accountProfiles[profileId].earlyWarningBufferRate * 100);

  /** Buffer'ı görüntü için clamp'le: 100+ sentinelsiz gösterim, -50 altı sıkıştır. */
  function clampBuffer(p: number): number {
    if (!isFinite(p)) return 0;
    return Math.max(-50, Math.min(100, p));
  }
  function isOver100(p: number): boolean {
    return isFinite(p) && p > 100;
  }

  const points = $derived(
    projection.days.map((d) => ({
      x: d.day,
      y: clampBuffer(d.bufferPct),
      marker: d.riskStatus === 'margin-call'
    }))
  );

  function statusClass(s: string): string {
    if (s === 'margin-call') return 'mc';
    if (s === 'maintenance-risk') return 'mr';
    if (s === 'early-warning') return 'ew';
    if (s === 'controlled') return 'ok';
    return 'unknown';
  }

  const selectedCell = $derived.by(() => {
    if (!selected) return null;
    const ci = matrix.tradeShocks.indexOf(selected.ts);
    const ri = matrix.portfolioShocks.indexOf(selected.ps);
    if (ci < 0 || ri < 0) return null;
    return matrix.cells[ri][ci];
  });

  // İlk matrix görüntülemesinde riski en iyi açıklayan hücreyi seç:
  // - İlk 'margin-call' hücresi; yoksa ilk 'maintenance-risk'; yoksa ilk 'early-warning';
  // - Hiçbiri yoksa orta hücre (0,0) ki buffer=1000 ise "no threshold" gösterir.
  $effect(() => {
    if (view !== 'matrix' || hasAutoSelected) return;
    const priority: string[] = ['margin-call', 'maintenance-risk', 'early-warning'];
    for (const p of priority) {
      for (let r = 0; r < matrix.cells.length; r++) {
        for (let c = 0; c < matrix.cells[r].length; c++) {
          const cell = matrix.cells[r][c];
          if (cell.riskStatus === p) {
            selected = { ts: cell.tradeShock, ps: cell.portfolioShock };
            hasAutoSelected = true;
            return;
          }
        }
      }
    }
    // fallback: trade=-0.15, portfolio=-0.10 (raporun önerdiği risk hücresi)
    const targetTs = -0.15;
    const targetPs = -0.1;
    if (matrix.tradeShocks.includes(targetTs) && matrix.portfolioShocks.includes(targetPs)) {
      selected = { ts: targetTs, ps: targetPs };
    } else {
      // en yakın
      const ts = matrix.tradeShocks.reduce((a, b) => (Math.abs(b - targetTs) < Math.abs(a - targetTs) ? b : a));
      const ps = matrix.portfolioShocks.reduce((a, b) => (Math.abs(b - targetPs) < Math.abs(a - targetPs) ? b : a));
      selected = { ts, ps };
    }
    hasAutoSelected = true;
  });

  function cellDisplay(p: number): string {
    if (!isFinite(p)) return t('mlmLegendUnknown');
    if (p > 100) return t('mlmCellOver100');
    return fmtPct(p, 0);
  }
  function bufferLabel(p: number): string {
    if (!isFinite(p)) return t('mlmLegendUnknown');
    if (p > 100) return t('mlmCellNoThreshold');
    return fmtPct(p, 1);
  }
  function statusLabel(s: RiskStatus | 'unknown'): string {
    return riskStatusLabel(s);
  }

  // Önerilen aksiyonlar: 1 lot azalt / N ek nakit / haircut dene / alternatif bul.
  // Burada 1 lot azaltma + yeterli nakit ekleme miktarını kabaca üretiriz.
  // trade shares, current trade price: 1 lot = 1 pay demek. Trade'in kendisini 1 pay azaltınca
  // yeni buffer yüzdesini veya ne kadar collateral kurtaracağını yaklaşık hesaplamak zor.
  // Burada yalnızca "kaç lot azaltırsan" ve "ne kadar ek nakit" metnini üretiriz, gerçek
  // değerleri matrix-cell içindeki 1 lot delta ile yaklaşık hesaplarız (1 lot = tradePrice).
  const ticker = $derived(app.currentTrade?.ticker ?? '');
  const suggestedLotReducePct = $derived.by(() => {
    if (!selectedCell) return null;
    // 1 lot azaltma bufferPct'i ne kadar yukarı çeker? Tam simülasyon yerine
    // engine'i tekrar çağırmak pahalı olur; burada heuristic: 1 lot, 0 buffer ise ~equity*ratio.
    // Basitçe: lot azaltıldığında buffer ~mevcut buffer + tradeValue/maintenanceReq*100.
    if (!isFinite(selectedCell.bufferPct)) return null;
    const trade = selectedCell.tradeValue;
    const maint = trade * 0.25; // yaklaşık maintenance req
    if (maint <= 0) return null;
    const delta = (trade / maint) * 100;
    return Math.max(0, selectedCell.bufferPct + delta);
  });
  const suggestedCashAdd = $derived.by(() => {
    if (!selectedCell) return null;
    const t = selectedCell.tradeValue;
    return t * 0.25; // ~1 lot'un maintenance karşılığı
  });
</script>

<ChartCard title={t('mlmTitle')} subtitle={t('mlmSubtitle2')}>
  {#snippet chart()}
    <div class="mcm">
      <div class="mcm-tabs">
        <button class:active={view === 'timeline'} onclick={() => (view = 'timeline')}>{t('mlmTimeline')}</button>
        <button class:active={view === 'matrix'} onclick={() => (view = 'matrix')}>{t('mlmMatrix')}</button>
      </div>

      <div class="mcm-legend" aria-label={t('mlmLegendTitle')}>
        <span class="lg lg-ok"><i></i> {t('mlmLegendControlled')}</span>
        <span class="lg lg-ew"><i></i> {t('mlmLegendEarlyWarning')}</span>
        <span class="lg lg-mr"><i></i> {t('mlmLegendMaintenance')}</span>
        <span class="lg lg-mc"><i></i> {t('mlmLegendMarginlab')}</span>
        <span class="lg lg-unknown"><i></i> {t('mlmLegendUnknown')}</span>
      </div>

      {#if view === 'timeline'}
        <div class="mcm-chart">
          <Badge
            level={projection.calculationStatus === 'calculated' && projection.marginCallDay >= 0 ? 'danger' : 'success'}
            label={projection.calculationStatus === 'insufficient-data'
              ? t('scenStatusInsufficientData')
              : projection.marginCallDay < 0
                ? t('simRunwayLong')
                : t('simMcDay', { day: projection.marginCallDay })}
          />
          {#if projection.days.length > 0}
            <LineChart
              {points}
              threshold={0}
              earlyWarning={ewPct}
              height={260}
              yMin={-50}
              yMax={100}
              xLabel={t('unitDay')}
              ariaLabel={t('mlmTimelineAria')}
            />
          {/if}
          <p class="micro">
            {t('mlmMicro', { ewPct: ewPct.toFixed(0) })}
          </p>
        </div>
      {:else}
        <div class="mcm-matrix" role="region" aria-label={t('mlmMatrix')}>
          <div class="mm-axis">
            <span class="mm-axis-y">{t('mlmAxisPortfolio')}</span>
            <span class="mm-axis-x">{t('mlmAxisTrade')} →</span>
            <span class="mm-axis-cell">{t('mlmAxisCell')}</span>
          </div>
          <table class="mm-grid" role="grid" aria-label={t('mlmMatrix')}>
              <thead>
                <tr>
                  <th class="mm-corner" scope="col">{t('mlmCorner')}</th>
                  {#each matrix.tradeShocks as ts (ts)}
                    <th scope="col">{fmtPct(ts * 100, 0)}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each matrix.portfolioShocks as ps (ps)}
                  <tr>
                    <th scope="row">{fmtPct(ps * 100, 0)}</th>
                    {#each matrix.tradeShocks as ts, ci (ts)}
                      {@const cell = matrix.cells[matrix.portfolioShocks.indexOf(ps)][ci]}
                      <td>
                        <button
                          class="mm-cell {statusClass(cell.riskStatus)}"
                          class:sel={selected?.ts === ts && selected?.ps === ps}
                          onclick={() => (selected = { ts, ps })}
                          aria-label={t('mlmCellAria', { trade: fmtPct(ts * 100, 0), portfolio: fmtPct(ps * 100, 0), status: statusLabel(cell.riskStatus as RiskStatus) })}
                        >
                          <span class="mm-cell-val">{cellDisplay(cell.bufferPct)}</span>
                        </button>
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>

            <p class="micro axis-help">
              {t('mlmAutoSelectHint', { trade: '-15%', portfolio: '-10%' })}
            </p>

            {#if selectedCell}
            <div class="mm-detail">
              <div class="mm-d-head">
                <Badge
                  level={selectedCell.riskStatus === 'margin-call' || selectedCell.riskStatus === 'maintenance-risk' ? 'danger' : selectedCell.riskStatus === 'early-warning' ? 'warning' : selectedCell.riskStatus === 'controlled' ? 'success' : 'neutral'}
                  label={statusLabel(selectedCell.riskStatus as RiskStatus)}
                />
                <span class="mm-d-sub">{t('mlmCellSub', { trade: fmtPct(selectedCell.tradeShock * 100, 0), portfolio: fmtPct(selectedCell.portfolioShock * 100, 0) })}</span>
              </div>
              <p class="mm-d-status">{t('mlmSelectedShock', { ticker: ticker || '—', trade: fmtPct(selectedCell.tradeShock * 100, 0), portfolio: fmtPct(selectedCell.portfolioShock * 100, 0) })}</p>
              <ul>
                <li><span>{t('mlmBuffer')}</span><strong class="tabular">{bufferLabel(selectedCell.bufferPct)}</strong></li>
                <li><span>{t('mlmTradeValue')}</span><strong class="tabular">{fmtMoney(selectedCell.tradeValue)}</strong></li>
                <li><span>{t('mlmPortfolioValue')}</span><strong class="tabular">{fmtMoney(selectedCell.portfolioValue)}</strong></li>
              </ul>
              {#if selectedCell.calculationStatus !== 'insufficient-data'}
                <div class="mm-d-rec">
                  <div class="mm-d-rec-title">{t('mlmRecAction')}</div>
                  {#if suggestedLotReducePct !== null}
                    <div class="mm-d-rec-row">→ {t('mlmRecLotReduce', { n: 1, pct: fmtPct(suggestedLotReducePct, 0) })}</div>
                  {/if}
                  {#if suggestedCashAdd !== null}
                    <div class="mm-d-rec-row">→ {t('mlmRecCashAdd', { value: fmtMoney(suggestedCashAdd) })}</div>
                  {/if}
                </div>
              {:else}
                <p class="micro">{t('mlmCellTooltip')}</p>
              {/if}
            </div>
          {:else}
            <p class="micro">{t('mlmSelectCell')}</p>
          {/if}
        </div>
      {/if}
    </div>
  {/snippet}
</ChartCard>

<style>
  .mcm {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .mcm-tabs {
    display: flex;
    gap: var(--space-2);
  }
  .mcm-tabs button {
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }
  .mcm-tabs button.active {
    background: var(--text);
    color: var(--inverse);
    border-color: var(--text);
  }
  .mcm-legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    font-size: 12px;
    color: var(--muted);
  }
  .lg {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .lg i {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid var(--border);
  }
  .lg-ok i { background: color-mix(in srgb, var(--success) 40%, var(--surface)); }
  .lg-ew i { background: color-mix(in srgb, var(--warning) 50%, var(--surface)); }
  .lg-mr i { background: color-mix(in srgb, var(--danger) 55%, var(--surface)); }
  .lg-mc i { background: color-mix(in srgb, var(--danger) 80%, var(--surface)); }
  .lg-unknown i { background: var(--surface-3); }
  .micro {
    font-size: 12px;
    color: var(--faint);
    margin-top: 4px;
  }
  .axis-help {
    margin-top: 0;
  }
  .mcm-axis {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .mm-axis-y, .mm-axis-x {
    font-weight: 600;
  }
  .mm-axis-cell {
    color: var(--faint);
  }
  .mm-grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .mm-grid th,
  .mm-grid td {
    padding: 6px 4px;
    text-align: center;
    border: 1px solid var(--border);
  }
  .mm-corner,
  .mm-head,
  .mm-rowhead {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    padding: 4px;
    text-align: center;
    background: var(--surface-2);
  }
  .mm-rowhead {
    text-align: right;
    white-space: nowrap;
    min-width: 56px;
  }
  .mm-cell {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 4px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    color: var(--text);
    background: var(--surface);
    text-align: center;
    width: 100%;
    height: 100%;
  }
  .mm-cell-val {
    display: block;
  }
  .mm-cell.ok {
    background: color-mix(in srgb, var(--success) 22%, var(--surface));
  }
  .mm-cell.ew {
    background: color-mix(in srgb, var(--warning) 30%, var(--surface));
  }
  .mm-cell.mr {
    background: color-mix(in srgb, var(--danger) 38%, var(--surface));
  }
  .mm-cell.mc {
    background: color-mix(in srgb, var(--danger) 60%, var(--surface));
    color: var(--inverse);
  }
  .mm-cell.unknown {
    background: var(--surface-3);
    color: var(--faint);
  }
  .mm-cell.sel {
    outline: 2px solid var(--text);
    outline-offset: 1px;
  }
  .mm-detail {
    margin-top: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    background: var(--surface-2);
  }
  .mm-d-head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: 6px;
  }
  .mm-d-sub {
    font-size: 12px;
    color: var(--muted);
  }
  .mm-d-status {
    font-size: 13px;
    color: var(--text);
    margin: 0 0 var(--space-2);
  }
  .mm-detail ul {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .mm-detail li {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
  .mm-d-rec {
    margin-top: var(--space-3);
    border-top: 1px solid var(--border);
    padding-top: var(--space-2);
  }
  .mm-d-rec-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .mm-d-rec-row {
    font-size: 13px;
    color: var(--text);
    padding: 2px 0;
  }
</style>
