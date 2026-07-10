<script lang="ts">
  interface Pt {
    x: number;
    y: number;
    marker?: boolean;
  }

  let {
    points,
    threshold,
    height = 280,
    yMin = 0,
    yMax = 100,
    xLabel = 'Gün',
    yLabel = 'Özkaynak oranı %'
  }: {
    points: Pt[];
    threshold: number;
    height?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    yLabel?: string;
  } = $props();

  const W = 480;
  const padL = 40;
  const padR = 16;
  const padT = 14;
  const padB = 34;
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
</script>

<svg viewBox="0 0 {W} {height}" class="chart" role="img" preserveAspectRatio="xMidYMid meet">
  <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="var(--border)" />
  <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--border)" />

  <!-- y gridlines -->
  {#each [0, 25, 50, 75, 100] as g (g)}
    <line x1={padL} y1={py(g)} x2={W - padR} y2={py(g)} stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2 3" opacity="0.5" />
    <text x={padL - 6} y={py(g) + 3} text-anchor="end" class="ax" fill="var(--faint)">{g}</text>
  {/each}

  <!-- threshold (maintenance) -->
  <line x1={padL} y1={py(threshold)} x2={W - padR} y2={py(threshold)} stroke="var(--danger)" stroke-width="1.5" stroke-dasharray="5 4" />
  <text x={W - padR} y={py(threshold) - 5} text-anchor="end" class="thr" fill="var(--danger)">
    Sürdürme %{threshold}
  </text>

  <polyline points={path} fill="none" stroke="var(--text)" stroke-width="2.5" stroke-linejoin="round" />

  {#each points as p (p.x)}
    {#if p.marker}
      <circle cx={px(p.x)} cy={py(p.y)} r="4.5" fill="var(--danger)" stroke="var(--bg)" stroke-width="2" />
    {/if}
  {/each}

  <text x={W - padR} y={height - 10} text-anchor="end" class="ax" fill="var(--muted)">{xLabel}</text>
  <text x={padL} y={padT - 2} class="ax" fill="var(--muted)">{yLabel}</text>
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
</style>
