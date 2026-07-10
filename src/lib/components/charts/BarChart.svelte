<script lang="ts">
  interface Bar {
    label: string;
    value: number;
    color?: string;
  }

  import { t } from '$lib/i18n';

  let {
    data,
    max = 100,
    unit = '',
    height = 240,
    ariaLabel = t('chartBar')
  }: { data: Bar[]; max?: number; unit?: string; height?: number; ariaLabel?: string } = $props();

  const W = 480;
  const padX = 16;
  const padTop = 14;
  const padBottom = 34;
  const plotH = $derived(height - padTop - padBottom);
  const plotW = W - padX * 2;
  const n = $derived(data.length || 1);
  const gap = 14;
  const bw = $derived((plotW - gap * (n - 1)) / n);

  function x(i: number) {
    return padX + i * (bw + gap);
  }
  function h(v: number) {
    return Math.max(0, Math.min(1, v / max)) * plotH;
  }
</script>

<svg viewBox="0 0 {W} {height}" class="chart" role="img" aria-label={ariaLabel} preserveAspectRatio="xMidYMid meet">
  <line x1={padX} y1={padTop + plotH} x2={W - padX} y2={padTop + plotH} stroke="var(--border)" stroke-width="1" />
  {#each data as d, i (d.label)}
    {@const bh = h(d.value)}
    <rect x={x(i)} y={padTop + plotH - bh} width={bw} height={bh} rx="4" fill={d.color ?? 'var(--text)'} />
    <text x={x(i) + bw / 2} y={padTop + plotH - bh - 6} text-anchor="middle" class="val" fill="var(--text)">
      {Math.round(d.value)}{unit}
    </text>
    <text x={x(i) + bw / 2} y={height - 12} text-anchor="middle" class="lbl" fill="var(--muted)">
      {d.label}
    </text>
  {/each}
</svg>

<style>
  .chart {
    width: 100%;
    height: auto;
    display: block;
  }
  .val {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .lbl {
    font-size: 11px;
    font-weight: 600;
  }
</style>
