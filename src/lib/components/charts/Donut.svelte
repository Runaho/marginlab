<script lang="ts">
  interface Slice {
    label: string;
    value: number;
    color: string;
  }

  let { data, size = 220 }: { data: Slice[]; size?: number } = $props();

  const total = $derived(data.reduce((s, d) => s + d.value, 0) || 1);
  const r = $derived(size / 2 - 4);
  const cx = $derived(size / 2);
  const cy = $derived(size / 2);

  function arc(cum: number, frac: number) {
    const a0 = cum * 2 * Math.PI - Math.PI / 2;
    const a1 = (cum + frac) * 2 * Math.PI - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
  }
</script>

<div class="donut-wrap">
  <svg viewBox="0 0 {size} {size}" width={size} height={size} role="img">
    {#if total <= 0}
      <circle {cx} {cy} r={r - 14} fill="none" stroke="var(--border)" stroke-width="2" />
    {:else}
      {@const segs = data.map((d) => ({ d, frac: d.value / total }))}
      {#each segs as s, i (s.d.label)}
        <path d={arc(segs.slice(0, i).reduce((a, b) => a + b.frac, 0), s.frac)} fill={s.d.color} stroke="var(--bg)" stroke-width="2" />
      {/each}
    {/if}
    <circle {cx} {cy} r={r - 22} fill="var(--surface)" />
    <text x={cx} y={cy - 4} text-anchor="middle" class="center" fill="var(--text)">
      {Math.round(total)}%
    </text>
    <text x={cx} y={cy + 14} text-anchor="middle" class="sub" fill="var(--muted)">dağılım</text>
  </svg>
  <ul class="legend">
    {#each data as d (d.label)}
      <li>
        <span class="sw" style="background:{d.color}"></span>
        <span class="lbl">{d.label}</span>
        <span class="pct">{((d.value / total) * 100).toFixed(1)}%</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .donut-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    flex-wrap: wrap;
  }
  .center {
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .sub {
    font-size: 10px;
    fill: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 160px;
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
  }
  .sw {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .lbl {
    flex: 1;
    color: var(--muted);
  }
  .pct {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>
