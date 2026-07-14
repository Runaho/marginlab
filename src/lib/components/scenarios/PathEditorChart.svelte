<script lang="ts">
  import { onMount } from 'svelte';
  import type { AnchorPoint, PathInterpolation } from '$lib/engine/types';
  import { SCENARIO_LIMITS } from '$lib/engine/types';
  import { flattenPathToDailyShocks } from '$lib/engine/account/scenarioEngine';
  import { t } from '$lib/i18n';

  let {
    tradePath = $bindable(),
    portfolioPath = $bindable(),
    interpolation = $bindable(),
    holdingPeriod,
    selected,
    onSelect,
    onChange
  }: {
    tradePath: AnchorPoint[];
    portfolioPath: AnchorPoint[];
    interpolation: PathInterpolation;
    holdingPeriod: number;
    selected: { series: 'trade' | 'portfolio'; day: number } | null;
    onSelect?: (sel: { series: 'trade' | 'portfolio'; day: number } | null) => void;
    onChange?: () => void;
  } = $props();

  // Chart geometry
  const W = 720;
  const H = 240;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Y-axis: -100% to +100% (display), but data can go beyond; we clamp at the visual level.
  const Y_MIN = -1;
  const Y_MAX = 1;
  const Y_TICKS = [-1, -0.5, 0, 0.5, 1];

  function xForDay(day: number): number {
    if (holdingPeriod <= 0) return PAD.left;
    return PAD.left + (day / holdingPeriod) * innerW;
  }
  function yForPct(pct: number): number {
    const clamped = Math.max(Y_MIN, Math.min(Y_MAX, pct));
    return PAD.top + (1 - (clamped - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;
  }

  // Daily flattened series for the line (across the entire horizon)
  const tradeSeries = $derived(
    flattenPathToDailyShocks(tradePath, holdingPeriod, interpolation)
  );
  const portSeries = $derived(
    flattenPathToDailyShocks(portfolioPath, holdingPeriod, interpolation)
  );

  function buildLine(series: number[]): string {
    return series
      .map((v, d) => `${xForDay(d)},${yForPct(v)}`)
      .join(' ');
  }

  // Anchor coords for hit-test rendering
  function tradeAnchors(): { day: number; pct: number; x: number; y: number }[] {
    return tradePath
      .filter((p) => p.day >= 0 && p.day <= holdingPeriod)
      .sort((a, b) => a.day - b.day)
      .map((p) => ({ day: p.day, pct: p.changePct, x: xForDay(p.day), y: yForPct(p.changePct) }));
  }
  function portAnchors(): { day: number; pct: number; x: number; y: number }[] {
    return portfolioPath
      .filter((p) => p.day >= 0 && p.day <= holdingPeriod)
      .sort((a, b) => a.day - b.day)
      .map((p) => ({ day: p.day, pct: p.changePct, x: xForDay(p.day), y: yForPct(p.changePct) }));
  }

  // Mouse → chart coordinates
  let svgEl: SVGSVGElement | null = $state(null);
  function svgPointToDay(clientX: number): number {
    if (!svgEl) return 0;
    const rect = svgEl.getBoundingClientRect();
    // Ölçek düzeltmesi (responsive)
    const ratio = W / rect.width;
    const xInSvg = (clientX - rect.left) * ratio;
    const innerX = Math.max(0, Math.min(innerW, xInSvg - PAD.left));
    const day = Math.round((innerX / innerW) * holdingPeriod);
    return Math.max(0, Math.min(holdingPeriod, day));
  }

  // Drag state
  let dragging: { series: 'trade' | 'portfolio'; day: number } | null = $state(null);

  function chartClick(ev: MouseEvent) {
    if ((ev.target as Element)?.tagName === 'circle') return; // Anchor click handles itself
    const day = svgPointToDay(ev.clientX);
    if (day === 0 || day === holdingPeriod) {
      // Locked edges; no add.
      return;
    }
    addAnchor('trade', day);
    onSelect?.({ series: 'trade', day });
    onChange?.();
  }

  function anchorPointerDown(series: 'trade' | 'portfolio', day: number, ev: PointerEvent) {
    ev.stopPropagation();
    if (day === 0 || day === holdingPeriod) {
      onSelect?.({ series, day });
      return;
    }
    dragging = { series, day };
    onSelect?.({ series, day });
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  function onPointerMove(ev: PointerEvent) {
    if (!dragging || !svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const ratio = H / rect.height;
    const yInSvg = (ev.clientY - rect.top) * ratio;
    const innerY = Math.max(0, Math.min(innerH, yInSvg - PAD.top));
    const pct = Y_MIN + (1 - innerY / innerH) * (Y_MAX - Y_MIN);
    setAnchorPct(dragging.series, dragging.day, pct);
    onChange?.();
  }

  function onPointerUp() {
    dragging = null;
  }

  function addAnchor(series: 'trade' | 'portfolio', day: number) {
    const cur = series === 'trade' ? tradePath : portfolioPath;
    const filtered = cur.filter((p) => p.day !== 0 && p.day !== holdingPeriod && p.day !== day);
    if (filtered.length >= SCENARIO_LIMITS.maxAnchorsPerPath) return;
    // Initial pct = interpolated value at this day (smooth start)
    const pct = interpolateAt(cur, day);
    const next: AnchorPoint[] = [...filtered, { day, changePct: pct }].sort((a, b) => a.day - b.day);
    if (series === 'trade') tradePath = next;
    else portfolioPath = next;
  }

  function interpolateAt(path: AnchorPoint[], day: number): number {
    const sorted = [...path].sort((a, b) => a.day - b.day);
    if (sorted.length === 0) return 0;
    // Find surrounding anchors
    let prev = sorted[0];
    let next = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].day <= day) prev = sorted[i];
      if (sorted[i].day >= day) {
        next = sorted[i];
        break;
      }
    }
    if (prev.day === next.day) return prev.changePct;
    const t = (day - prev.day) / (next.day - prev.day);
    return prev.changePct + (next.changePct - prev.changePct) * t;
  }

  function setAnchorPct(series: 'trade' | 'portfolio', day: number, pct: number) {
    const cur = series === 'trade' ? tradePath : portfolioPath;
    const bounds =
      series === 'trade'
        ? { min: SCENARIO_LIMITS.tradePctMin, max: SCENARIO_LIMITS.tradePctMax }
        : { min: SCENARIO_LIMITS.portfolioPctMin, max: SCENARIO_LIMITS.portfolioPctMax };
    const clamped = Math.max(bounds.min, Math.min(bounds.max, pct));
    const next = cur.map((p) => (p.day === day ? { ...p, changePct: clamped } : p));
    if (series === 'trade') tradePath = next;
    else portfolioPath = next;
  }

  function selectAnchor(series: 'trade' | 'portfolio', day: number, ev: Event) {
    ev.stopPropagation();
    onSelect?.({ series, day });
  }

  // Keyboard nav: ArrowUp/Down on selected anchor changes %
  function onAnchorKey(ev: KeyboardEvent, series: 'trade' | 'portfolio', day: number) {
    const step = ev.shiftKey ? 0.1 : 0.01;
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      const cur = (series === 'trade' ? tradePath : portfolioPath).find((p) => p.day === day);
      if (cur) setAnchorPct(series, day, cur.changePct + step);
      onChange?.();
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      const cur = (series === 'trade' ? tradePath : portfolioPath).find((p) => p.day === day);
      if (cur) setAnchorPct(series, day, cur.changePct - step);
      onChange?.();
    } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
      if (day === 0 || day === holdingPeriod) return;
      ev.preventDefault();
      const cur = series === 'trade' ? tradePath : portfolioPath;
      const next = cur.filter((p) => p.day !== day);
      if (series === 'trade') tradePath = next;
      else portfolioPath = next;
      onSelect?.(null);
      onChange?.();
    }
  }

  onMount(() => {
    const up = () => onPointerUp();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  });
</script>

<div class="pe-wrap">
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <svg
    bind:this={svgEl}
    class="pe-svg"
    viewBox="0 0 {W} {H}"
    preserveAspectRatio="xMidYMid meet"
    role="application"
    aria-label={t('simPathEditorAria')}
    onclick={chartClick}
    onkeydown={() => {}}
    onpointermove={onPointerMove}
  >
    <!-- Background grid -->
    <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="var(--surface)" stroke="var(--border)" />

    {#each Y_TICKS as t (t)}
      <line
        x1={PAD.left}
        x2={PAD.left + innerW}
        y1={yForPct(t)}
        y2={yForPct(t)}
        stroke="var(--border)"
        stroke-dasharray={t === 0 ? '0' : '2 4'}
      />
      <text x={PAD.left - 6} y={yForPct(t) + 4} text-anchor="end" font-size="10" fill="var(--faint)">
        {(t * 100).toFixed(0)}%
      </text>
    {/each}

    <!-- X ticks -->
    {#each [0, Math.round(holdingPeriod / 4), Math.round(holdingPeriod / 2), Math.round((3 * holdingPeriod) / 4), holdingPeriod] as d (d)}
      <text x={xForDay(d)} y={H - 8} text-anchor="middle" font-size="10" fill="var(--faint)">
        {t('simPathDayShort', { n: d })}
      </text>
    {/each}

    <!-- Portfolio line (drawn first, dashed) -->
    <polyline
      points={buildLine(portSeries)}
      fill="none"
      stroke="var(--success)"
      stroke-width="2"
      stroke-dasharray="4 3"
    />
    <!-- Trade line (solid, primary) -->
    <polyline
      points={buildLine(tradeSeries)}
      fill="none"
      stroke="var(--text)"
      stroke-width="2.5"
    />

    <!-- Anchors -->
    {#each tradeAnchors() as a (a.day + '-t')}
      <circle
        cx={a.x}
        cy={a.y}
        r={selected?.series === 'trade' && selected.day === a.day ? 7 : 5}
        fill={selected?.series === 'trade' && selected.day === a.day ? 'var(--text)' : 'var(--surface)'}
        stroke="var(--text)"
        stroke-width="2"
        tabindex={a.day === 0 || a.day === holdingPeriod ? -1 : 0}
        role="button"
        aria-label={t('simPathAnchorTrade', { day: a.day, pct: (a.pct * 100).toFixed(0) })}
        onclick={(e) => selectAnchor('trade', a.day, e)}
        onpointerdown={(e) => anchorPointerDown('trade', a.day, e)}
        onkeydown={(e) => onAnchorKey(e, 'trade', a.day)}
        style="cursor: {a.day === 0 || a.day === holdingPeriod ? 'default' : 'grab'}"
      />
    {/each}
    {#each portAnchors() as a (a.day + '-p')}
      <rect
        x={a.x - 5}
        y={a.y - 5}
        width="10"
        height="10"
        fill={selected?.series === 'portfolio' && selected.day === a.day ? 'var(--success)' : 'var(--surface)'}
        stroke="var(--success)"
        stroke-width="2"
        tabindex={a.day === 0 || a.day === holdingPeriod ? -1 : 0}
        role="button"
        aria-label={t('simPathAnchorPortfolio', { day: a.day, pct: (a.pct * 100).toFixed(0) })}
        onclick={(e) => selectAnchor('portfolio', a.day, e)}
        onpointerdown={(e) => anchorPointerDown('portfolio', a.day, e)}
        onkeydown={(e) => onAnchorKey(e, 'portfolio', a.day)}
        style="cursor: {a.day === 0 || a.day === holdingPeriod ? 'default' : 'grab'}"
      />
    {/each}
  </svg>

  <div class="legend">
    <span class="lg-trade"><span class="dash dash-solid"></span>{t('simPathLegendTrade')}</span>
    <span class="lg-port"><span class="dash dash-dashed"></span>{t('simPathLegendPortfolio')}</span>
    <span class="hint">{t('simPathHelpHint')}</span>
  </div>
</div>

<style>
  .pe-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .pe-svg {
    width: 100%;
    height: auto;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: crosshair;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--muted);
  }
  .lg-trade, .lg-port {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .dash {
    width: 18px;
    height: 2px;
    display: inline-block;
  }
  .dash-solid { background: var(--text); }
  .dash-dashed {
    background: linear-gradient(to right, var(--success) 0 4px, transparent 4px 7px);
    background-size: 7px 2px;
    background-repeat: repeat-x;
    height: 2px;
  }
  .hint {
    margin-left: auto;
    font-style: italic;
  }
</style>