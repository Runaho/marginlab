<script lang="ts">
  import { app } from '$lib/state/appState.svelte';
  import { portfolioStats, topLevel } from '$lib/engine/portfolio';
  import { fmtMoney, fmtPct, fmtNum, fmtShares, levelLabel } from '$lib/utils/format';
  import { SECTOR_COLORS } from '$lib/utils/colors';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import KpiCard from '$lib/components/ui/KpiCard.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import Donut from '$lib/components/charts/Donut.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';

  const stats = $derived(portfolioStats(app.portfolio));

  const healthProfile = $derived([
    { label: 'Genel', value: stats.health, color: 'var(--text)' },
    { label: 'Nakit', value: Math.min(stats.cashRatio * 100, 100), color: 'var(--success)' },
    {
      label: 'Çeşitlilik',
      value: Math.max(0, (1 - stats.concentration) * 100),
      color: stats.concentration > 0.4 ? 'var(--danger)' : 'var(--success)'
    },
    {
      label: 'Beta dengesi',
      value: Math.max(0, Math.min(100, 100 - Math.max(0, stats.weightedBeta - 1) * 100)),
      color: stats.weightedBeta > 1.6 ? 'var(--danger)' : 'var(--text)'
    }
  ]);

  const allocation = $derived(
    Object.entries(stats.sectorWeights)
      .filter(([, w]) => w > 0)
      .map(([sector, w]) => ({
        label: sector,
        value: w * 100,
        color: SECTOR_COLORS[sector as keyof typeof SECTOR_COLORS] ?? 'var(--muted)'
      }))
  );

  const top = $derived(topLevel(stats.alerts));
  const bufferPct = $derived(
    app.portfolio.account.maintenanceMargin > 0
      ? ((1 - app.portfolio.account.maintenanceMargin) * 100)
      : 0
  );
</script>

<PageHeader eyebrow="Executive view" title="Portföy, margin ve senaryo mantığını tek karar akışında birleştir.">
  Açıkla — sonra hesapla. MarginCall, portföyünü bir teminat motoru olarak okur; trade′i açmadan önce
  maliyetini, riskini ve dayanıklılığını gösterir.
</PageHeader>

<GuidedNote title="Başlamadan önce">
  Sol üstteki <strong>Rehber</strong> (kitap) simgesiyle bu tip notları açıp kapatabilirsin. Her sayfa
  sana önce kararı, sonra mantığı gösterir.
</GuidedNote>

<div class="hero">
  <div class="hero-panel">
    <div class="eyebrow">Genel Bakış</div>
    <h2>Portföyün şu an ne kadar sağlıklı?</h2>
    <p>
      Toplam <strong>{fmtMoney(stats.total)}</strong> değerinin {fmtMoney(stats.totalInvested)}′i
      hisselerde, {fmtMoney(stats.cash)}′i nakitte. En büyük pozisyonun ağırlığı
      <strong>{fmtPct(stats.concentration * 100, 0)}</strong>.
    </p>
    <div class="hero-cta">
      <a class="btn-primary" href="/simulator"><Icon name="calculator" size={18} /> Margin simülasyonuna git</a>
      <a class="btn-ghost" href="/finder"><Icon name="scan-search" size={18} /> Trade bul</a>
    </div>
  </div>
  <div class="hero-side">
    {@render Metric('wallet', 'Toplam portföy', fmtMoney(stats.total), `${stats.holdings.length} hisse · nakit ${fmtPct(stats.cashRatio * 100, 0)}`)}
    {@render Metric('shield', 'Margin buffer (teorik)', fmtPct(bufferPct, 0), 'Sürdürme altına düşmeden düşüş payı')}
    {@render Metric('pie', 'Yoğunlaşma', fmtPct(stats.concentration * 100, 0), 'En büyük pozisyon')}
  </div>
</div>

<div class="kpi-grid">
  <KpiCard label="Portföy Sağlık Skoru" value={`${stats.health}/100`} hint={`Beta ${fmtNum(stats.weightedBeta, 2)} · nakit ${fmtPct(stats.cashRatio * 100, 0)}`} icon="shield-check" level={top} />
  <KpiCard label="Kullanılabilir Teminat" value={fmtMoney(stats.availableCollateral)} hint="Nakit + hisse teminatı" icon="wallet" />
  <KpiCard label="Alım Gücü" value={fmtMoney(stats.buyingPower)} hint="Teminat / başlangıç oranı" icon="trending" />
  <KpiCard label="En Büyük Pozisyon" value={stats.largest ? stats.largest.ticker : '—'} hint={stats.largest ? `${fmtShares(stats.largest.shares)} adet · ${fmtPct(stats.largest.weight * 100, 0)}` : ''} icon="briefcase" />
</div>

<div class="banner">
  {#each stats.alerts as a (a.title)}
    <WarningBox level={a.level} title={a.title} detail={a.detail} />
  {/each}
</div>

<div class="two-col">
  <section class="card">
    <div class="card-head">
      <h3>Sağlık profili</h3>
      <Badge level={top} label={levelLabel(top)} />
    </div>
    <BarChart data={healthProfile} unit="" />
    <p class="foot-note">{stats.healthNarrative}</p>
  </section>

  <section class="card">
    <div class="card-head">
      <h3>Dağılım (sektör)</h3>
    </div>
    <Donut data={allocation} />
  </section>
</div>

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
  .foot-note {
    font-size: 13px;
    color: var(--muted);
    margin-top: var(--space-3);
    line-height: 1.5;
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
