<script lang="ts">
  import { app } from '$lib/state/appState.svelte';
  import { settings, getActiveProfileId } from '$lib/engine/settings/settingsStore.svelte';
  import { selectAccount, topLevel } from '$lib/engine/selectors/selectAccount';
  import { selectTradeImpact } from '$lib/engine/selectors/selectTradeImpact';
  import { SCENARIOS } from '$lib/engine/presets';
  import { getMarket, betaFor, sectorFor } from '$lib/engine/market';
  import { fmtMoney, fmtPct } from '$lib/utils/format';
  import Icon from '../icons/Icon.svelte';
  import { t } from '$lib/i18n';

  const stats = $derived(
    selectAccount({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      profileId: getActiveProfileId(),
      settings
    })
  );

  // 1 · Açılabilir mi? — bekleyen trade varsa selectTradeImpact'e düş,
  // yoksa portföy sağlığına bak. TEK motor: selectTradeImpact.
  interface OpenState {
    ok: boolean;
    label: string;
    level: Level;
  }
  const openState = $derived.by<OpenState>(() => {
    const trade = app.currentTrade;
    if (trade) {
      const m = getMarket(trade.ticker);
      if (!m) {
        return { ok: false, label: t('decOpenInsufficient'), level: 'danger' };
      }
      const r = selectTradeImpact({
        cash: app.portfolio.cash,
        holdings: app.portfolio.holdings,
        trade: {
          ticker: trade.ticker,
          name: trade.ticker,
          shares: trade.shares,
          price: m.price,
          cost: m.price,
          beta: betaFor(trade.ticker),
          sector: sectorFor(m.category),
          collateral: stats.profileId === 'conservative'
            ? 0.5
            : stats.profileId === 'cash-first'
              ? 0
              : 0.75
        },
        additionalCash: 0,
        holdingDays: 30,
        profileId: getActiveProfileId(),
        settings
      });
      const label =
        r.eligibility === 'insufficient'
          ? t('decOpenInsufficient')
          : r.eligibility === 'covered-securities'
            ? t('decOpenCashLow')
            : t('decOpenOk');
      const level: Level = r.canOpen
        ? r.eligibility === 'covered-securities'
          ? 'warning'
          : r.buffer > 20
            ? 'success'
            : r.buffer > 0
              ? 'warning'
              : 'danger'
        : 'danger';
      return { ok: r.canOpen, label, level };
    }
    const lvl = topLevel(stats.alerts);
    return {
      ok: lvl === 'safe',
      label:
        lvl === 'safe'
          ? t('riskStatusControlled')
          : lvl === 'warning'
            ? t('riskStatusEarlyWarning')
            : t('riskStatusMaintenanceRisk'),
      level: lvl === 'safe' ? 'success' : lvl === 'warning' ? 'warning' : 'danger'
    };
  });

  // 2 · Gerçek hesap-temelli buffer: equity - maintenanceReq, maintenanceReq yüzdesi olarak.
  // maintenanceReq = 0 ise buffer "tanımsız" → %1000 sentinel'i UI'da "+100% buffer" olarak işlenir.
  const bufferPct = $derived(
    stats.collateral.maintenanceReq > 0
      ? (stats.collateral.excessLiquidity / stats.collateral.maintenanceReq) * 100
      : stats.collateral.excessLiquidity > 0
        ? 1000
        : 0
  );

  // 3 · Yoğunlaşma (en büyük pozisyon ağırlığı, settings eşiğine göre renk)
  const concentrationPct = $derived(stats.concentration * 100);
  const concThresholdPct = $derived(settings.collateralRisk.concentrationThreshold * 100);

  // 4 · En kötü senaryo P/L — tüm senaryolarda portföyün en kötü P/L'i (gerçek veri)
  const worstPL = $derived.by(() => {
    if (stats.totalInvested === 0) return 0;
    let worst = Infinity;
    for (const s of SCENARIOS) {
      let pl = 0;
      for (const h of app.portfolio.holdings) {
        pl += h.price * s.portfolioShock * h.shares;
      }
      if (pl < worst) worst = pl;
    }
    return worst === Infinity ? 0 : worst;
  });

  type Level = 'success' | 'warning' | 'danger' | 'neutral';
  const colorVar: Record<Level, string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    neutral: 'var(--muted)'
  };
</script>

<div class="strip" role="region" aria-label={t('decStripAria')} aria-live="polite">
  <div class="cell">
    <div class="ic" style="color:{colorVar[openState.level]}"><Icon name={openState.ok ? 'shield-check' : 'shield-alert'} size={18} /></div>
    <div class="meta">
      <span class="k">{t('decCanOpen')}</span>
      <span class="v" style="color:{colorVar[openState.level]}">{openState.label}</span>
    </div>
  </div>
  <div class="divider"></div>
  <div class="cell">
    <div class="ic"><Icon name="trending" size={18} /></div>
    <div class="meta">
      <span class="k">{t('metricMarginBuffer')}</span>
      <span class="v tabular">{fmtPct(Math.min(bufferPct, 100), 0)}</span>
    </div>
  </div>
  <div class="divider"></div>
  <div class="cell">
    <div class="ic" style="color:{concentrationPct > concThresholdPct ? 'var(--danger)' : concentrationPct > concThresholdPct * 0.75 ? 'var(--warning)' : 'var(--muted)'}"><Icon name="pie" size={18} /></div>
    <div class="meta">
      <span class="k">{t('metricConcentration')}</span>
      <span class="v tabular">{fmtPct(concentrationPct, 0)}</span>
    </div>
  </div>
  <div class="divider"></div>
  <div class="cell">
    <div class="ic"><Icon name="alert" size={18} /></div>
    <div class="meta">
      <span class="k">{t('decWorstPL')}</span>
      <span class="v tabular">{fmtMoney(worstPL, { sign: true })}</span>
    </div>
  </div>
</div>

<style>
  .strip {
    position: sticky;
    top: var(--top-h);
    z-index: 20;
    display: flex;
    align-items: stretch;
    gap: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-6);
    overflow: hidden;
    min-width: 0;
  }
  .cell {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
    padding: 4px var(--space-3);
  }
  .ic {
    flex-shrink: 0;
    color: var(--muted);
  }
  .meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  .k {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--faint);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .v {
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .divider {
    width: 1px;
    background: var(--border);
    margin: 6px 0;
  }
  @media (max-width: 760px) {
    .strip {
      flex-wrap: wrap;
      gap: var(--space-2);
      padding: var(--space-3);
    }
    .cell {
      flex: 1 1 calc(50% - var(--space-2));
      min-width: 0;
    }
    .divider {
      display: none;
    }
  }
  @media (max-width: 380px) {
    .cell {
      flex: 1 1 100%;
    }
  }
</style>
