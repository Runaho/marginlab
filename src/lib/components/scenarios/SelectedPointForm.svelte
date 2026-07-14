<script lang="ts">
  import type { AnchorPoint } from '$lib/engine/types';
  import { SCENARIO_LIMITS } from '$lib/engine/types';
  import { fmtPct } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import Icon from '$lib/components/icons/Icon.svelte';

  let {
    series,
    anchor,
    holdingPeriod,
    onUpdate,
    onDelete
  }: {
    series: 'trade' | 'portfolio' | null;
    anchor: AnchorPoint | null;
    holdingPeriod: number;
    onUpdate: (series: 'trade' | 'portfolio', day: number, patch: Partial<AnchorPoint>) => void;
    onDelete: (series: 'trade' | 'portfolio', day: number) => void;
  } = $props();

  const locked = $derived(!!anchor && (anchor.day === 0 || anchor.day === holdingPeriod));
  const bounds = $derived(
    series === 'trade'
      ? { min: SCENARIO_LIMITS.tradePctMin * 100, max: SCENARIO_LIMITS.tradePctMax * 100 }
      : { min: SCENARIO_LIMITS.portfolioPctMin * 100, max: SCENARIO_LIMITS.portfolioPctMax * 100 }
  );
</script>

<div class="spf" role="region" aria-label={t('simPathSelectedLabel')}>
  <div class="head">
    <span class="title">{t('simPathSelectedLabel')}</span>
    {#if !series || !anchor}
      <span class="empty">{t('simPathSelectedEmpty')}</span>
    {/if}
  </div>
  {#if series && anchor}
    <div class="row">
      <span class="lbl">{t('simPathSeriesLabel')}</span>
      <span class="val" class:trade={series === 'trade'} class:portfolio={series === 'portfolio'}>
        {series === 'trade' ? t('simPathTableTrade') : t('simPathTablePortfolio')}
      </span>
    </div>
    <div class="row">
      <label class="lbl" for="sp-day">{t('simPathDay')}</label>
      <input
        id="sp-day"
        type="number"
        min="0"
        max={holdingPeriod}
        value={anchor.day}
        disabled={locked}
        oninput={(e) => onUpdate(series, anchor.day, { day: parseInt((e.currentTarget as HTMLInputElement).value, 10) || 0 })}
      />
    </div>
    <div class="row">
      <label class="lbl" for="sp-pct">{t('simPathChangePct')}</label>
      <input
        id="sp-pct"
        type="number"
        step="0.5"
        min={bounds.min}
        max={bounds.max}
        value={Number((anchor.changePct * 100).toFixed(2))}
        oninput={(e) => onUpdate(series, anchor.day, { changePct: parseFloat((e.currentTarget as HTMLInputElement).value) / 100 || 0 })}
      />
      <span class="fmt">{fmtPct(anchor.changePct * 100, 1)}</span>
    </div>
    <div class="actions">
      <button type="button" class="del" disabled={locked} onclick={() => onDelete(series, anchor.day)}>
        <Icon name="x" size={14} /> {t('simPathDeleteSelected')}
      </button>
      {#if locked}
        <span class="lock-note">{t('simPathLockedDayNote')}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .spf {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 140px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }
  .empty {
    font-size: 11px;
    color: var(--faint);
    font-style: italic;
  }
  .row {
    display: grid;
    grid-template-columns: 80px 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .lbl {
    color: var(--muted);
    font-weight: 600;
  }
  input[type='number'] {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 13px;
    color: var(--text);
    width: 100%;
  }
  .val {
    font-weight: 700;
  }
  .val.trade { color: var(--text); }
  .val.portfolio { color: var(--success); }
  .fmt {
    font-size: 11px;
    color: var(--faint);
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  .del {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--danger);
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .del:disabled { opacity: 0.5; cursor: not-allowed; }
  .del:hover:not(:disabled) { background: color-mix(in srgb, var(--danger) 10%, var(--surface)); }
  .lock-note {
    font-size: 11px;
    color: var(--faint);
    font-style: italic;
  }
</style>