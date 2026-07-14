<script lang="ts">
  import type { AnchorPoint, PathInterpolation } from '$lib/engine/types';
  import { SCENARIO_LIMITS } from '$lib/engine/types';
  import { fmtPct } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import Icon from '$lib/components/icons/Icon.svelte';

  let {
    series = 'trade',
    path = $bindable(),
    holdingPeriod
  }: {
    series: 'trade' | 'portfolio';
    path: AnchorPoint[];
    holdingPeriod: number;
  } = $props();

  // Sıralı kopya (defensive; UI'da day artan garantilenir)
  let sorted = $derived(
    [...path].filter((p) => p.day > 0 && p.day <= holdingPeriod).sort((a, b) => a.day - b.day)
  );

  function commit(next: AnchorPoint[]) {
    const cleaned = next
      .filter((p) => p.day > 0 && p.day <= holdingPeriod && isFinite(p.changePct))
      .sort((a, b) => a.day - b.day);
    path = cleaned;
  }

  function updateAt(i: number, patch: Partial<AnchorPoint>) {
    const next = sorted.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    commit(next);
  }

  function removeAt(i: number) {
    const target = sorted[i];
    // Day 0 ve holdingPeriod kilitli (locked)
    if (!target || target.day === 0 || target.day === holdingPeriod) return;
    const next = sorted.filter((_, idx) => idx !== i);
    commit(next);
  }

  function addRow() {
    if (sorted.length >= SCENARIO_LIMITS.maxAnchorsPerPath) return;
    // İlk boş günü bul (day 0 ve holdingPeriod hariç)
    const used = new Set(sorted.map((p) => p.day));
    let day = Math.floor(holdingPeriod / 2);
    for (let d = 1; d < holdingPeriod; d++) {
      if (!used.has(d)) {
        day = d;
        break;
      }
    }
    const pct = sorted.length > 0 ? sorted[sorted.length - 1].changePct : 0;
    commit([...sorted, { day, changePct: pct }]);
  }

  function clampPctInput(raw: string, max: number, min: number): number {
    const n = parseFloat(raw);
    if (!isFinite(n)) return 0;
    return Math.max(min, Math.min(max, n));
  }
</script>

<div class="ptable" role="region" aria-label={series === 'trade' ? t('simPathTableTrade') : t('simPathTablePortfolio')}>
  <div class="ptable-head">
    <span class="lbl">{series === 'trade' ? t('simPathTableTrade') : t('simPathTablePortfolio')}</span>
    <span class="count">{sorted.length} / {SCENARIO_LIMITS.maxAnchorsPerPath}</span>
  </div>
  <table>
    <caption class="vh">{series === 'trade' ? t('simPathTableTrade') : t('simPathTablePortfolio')}</caption>
    <thead>
      <tr><th scope="col">{t('simPathDay')}</th><th scope="col">{t('simPathChangePct')}</th><th scope="col" class="act">{t('simPathActions')}</th></tr>
    </thead>
    <tbody>
      {#each sorted as p, i (p.day + '-' + i)}
        <tr>
          <td>
            <input
              type="number"
              min="1"
              max={holdingPeriod - 1}
              value={p.day}
              disabled={p.day === holdingPeriod}
              oninput={(e) => updateAt(i, { day: parseInt((e.currentTarget as HTMLInputElement).value, 10) || 0 })}
              aria-label={t('simPathDayLabel', { n: i + 1 })}
            />
          </td>
          <td>
            <input
              type="number"
              step="0.5"
              value={Number((p.changePct * 100).toFixed(2))}
              oninput={(e) => updateAt(i, {
                changePct: clampPctInput(
                  (e.currentTarget as HTMLInputElement).value,
                  series === 'trade' ? SCENARIO_LIMITS.tradePctMax * 100 : SCENARIO_LIMITS.portfolioPctMax * 100,
                  series === 'trade' ? SCENARIO_LIMITS.tradePctMin * 100 : SCENARIO_LIMITS.portfolioPctMin * 100
                ) / 100
              })}
              aria-label={t('simPathChangePctLabel', { n: i + 1 })}
            />
            <span class="micro">{fmtPct(p.changePct * 100, 0)}</span>
          </td>
          <td class="act">
            {#if p.day === 0 || p.day === holdingPeriod}
              <span class="lock" title={t('simPathLockedDay')}>🔒</span>
            {:else}
              <button type="button" class="icon-btn" onclick={() => removeAt(i)} aria-label={t('simPathDeleteLabel', { n: i + 1 })}>
                <Icon name="x" size={14} />
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <button type="button" class="add-btn" onclick={addRow} disabled={sorted.length >= SCENARIO_LIMITS.maxAnchorsPerPath}>
    <Icon name="plus" size={14} /> {t('simPathAddRow')}
  </button>
</div>

<style>
  .ptable {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .ptable-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .lbl {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }
  .count {
    font-size: 11px;
    color: var(--faint);
    font-variant-numeric: tabular-nums;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--faint);
    padding: 4px 6px;
    font-weight: 600;
  }
  th.act { text-align: right; }
  td {
    padding: 4px 6px;
    font-size: 13px;
    border-top: 1px solid var(--border);
  }
  td.act { text-align: right; }
  td input[type='number'] {
    width: 80px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px 6px;
    font-size: 13px;
    color: var(--text);
  }
  .micro {
    font-size: 11px;
    color: var(--faint);
    margin-left: 4px;
    font-variant-numeric: tabular-nums;
  }
  .icon-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 3px 5px;
    cursor: pointer;
    color: var(--muted);
  }
  .icon-btn:hover { color: var(--danger); border-color: var(--danger); }
  .lock {
    color: var(--faint);
    font-size: 11px;
  }
  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px dashed var(--border);
    color: var(--muted);
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
    align-self: flex-start;
  }
  .add-btn:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--text);
  }
  .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .vh {
    position: absolute;
    width: 1px; height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>