<script lang="ts">
  interface Pt {
    x: number;
    y: number;
    marker?: boolean;
  }

  import { t } from '$lib/i18n';

  let {
    points,
    threshold,
    earlyWarning,
    series2,
    height = 300,
    yMin = 0,
    yMax = 100,
    xLabel = t('unitDay'),
    ariaLabel = t('chartTimeSeries')
  }: {
    points: Pt[];
    threshold: number;
    earlyWarning?: number;
    series2?: Pt[];
    height?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    ariaLabel?: string;
  } = $props();

  const W = 480;
  const padL = 44;
  const padR = 56;
  const padT = 18;
  const padB = 44;
  const plotW = $derived(W - padL - padR);
  const plotH = $derived(height - padT - padB);

  const xMax = $derived(points.reduce((m, p) => Math.max(m, p.x), 1));
  const yLo = $derived(yMin);
  const yHi = $derived(yMax);

  function px(x: number) {
    return padL + (xMax > 0 ? x / xMax : 0) * plotW;
  }
  function py(y: number) {
    return padT + (1 - (y - yLo) / (yHi - yLo)) * plotH;
  }
  const path = $derived(points.map((p) => `${px(p.x)},${py(p.y)}`).join(' '));

  // Etiketlerin plot alanı içinde kalması için clamp
  const thrLabelY = $derived(Math.max(padT + 10, py(threshold) - 5));
  const ewLabelY = $derived(
    earlyWarning !== undefined
      ? Math.min(height - padB - 4, py(earlyWarning) + 14)
      : 0
  );
</script>

<svg viewBox="0 0 {W} {height}" class="chart" role="img" aria-label={ariaLabel} preserveAspectRatio="xMidYMid meet">
  <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="var(--border)" />
  <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--border)" />

  <!-- y gridlines -->
  {#each [0, 25, 50, 75, 100] as g (g)}
    <line x1={padL} y1={py(g)} x2={W - padR} y2={py(g)} stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2 3" opacity="0.5" />
    <text x={padL - 6} y={py(g) + 3} text-anchor="end" class="ax" fill="var(--faint)">{g}</text>
  {/each}

  <!-- x ekseni gün etiketi (son gün) -->
  <text x={px(xMax)} y={padT + plotH + 16} text-anchor="middle" class="ax" fill="var(--faint)">{xMax}</text>

  <!-- threshold (maintenance) — sağda -->
  <line x1={padL} y1={py(threshold)} x2={W - padR} y2={py(threshold)} stroke="var(--danger)" stroke-width="1.5" stroke-dasharray="5 4" />
  <text x={W - 6} y={thrLabelY} text-anchor="end" class="thr" fill="var(--danger)">
    {t('chartMaintenance', { threshold })}
  </text>

  {#if earlyWarning !== undefined}
    <line x1={padL} y1={py(earlyWarning)} x2={W - padR} y2={py(earlyWarning)} stroke="var(--warning)" stroke-width="1.25" stroke-dasharray="2 3" opacity="0.85" />
    <text x={padL + 6} y={ewLabelY} text-anchor="start" class="ew" fill="var(--warning)">
      {t('chartEarlyWarning', { earlyWarning })}
    </text>
  {/if}

  <polyline points={path} fill="none" stroke="var(--text)" stroke-width="2.5" stroke-linejoin="round" />

  {#if series2}
    {@const path2 = series2.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
    <polyline points={path2} fill="none" stroke="var(--warning)" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round" />
  {/if}

  {#each points as p (p.x)}
    {#if p.marker}
      <circle cx={px(p.x)} cy={py(p.y)} r="4.5" fill="var(--danger)" stroke="var(--bg)" stroke-width="2" />
    {/if}
  {/each}

  <text x={padL} y={height - 6} text-anchor="start" class="ax" fill="var(--muted)">{xLabel}</text>
</svg>

<style>
  .chart {
    width: 100%;
    height: auto;
    display: block;
  }
  .ax {
    font-size: 10px;
    font-weight: 600;
  }
  .thr {
    font-size: 10px;
    font-weight: 700;
  }
  .ew {
    font-size: 10px;
    font-weight: 600;
  }
</style>
