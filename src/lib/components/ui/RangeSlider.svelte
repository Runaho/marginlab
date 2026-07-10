<script lang="ts">
  let {
    label,
    value,
    min = 0,
    max = 100,
    step = 1,
    oninput,
    format = (v: number) => String(v),
    unit,
    defaultValue
  }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    oninput: (v: number) => void;
    format?: (v: number) => string;
    /** Sayısal input yanında gösterilecek birim (%, USD, gün) */
    unit?: string;
    /** Varsayılana dön için referans değer */
    defaultValue?: number;
  } = $props();

  import { t } from '$lib/i18n';

  function clamp(v: number): number {
    if (Number.isNaN(v)) return value;
    return Math.min(max, Math.max(min, v));
  }

  const showReset = $derived(defaultValue !== undefined && value !== defaultValue);
</script>

<div class="slider">
  <div class="top">
    <span class="lbl">{label}</span>
    <div class="ctrl">
      <input
        class="num tabular"
        type="text"
        inputmode="decimal"
        value={format(value)}
        aria-label={t('sliderAriaValue', { label })}
        oninput={(e) => {
          const raw = (e.currentTarget as HTMLInputElement).value.replace(/[^0-9.\-]/g, '');
          const n = parseFloat(raw);
          if (!Number.isNaN(n)) oninput(clamp(n));
        }}
      />
      {#if unit}<span class="unit">{unit}</span>{/if}
      {#if showReset}
        <button class="reset" title={t('sliderReset')} aria-label={t('sliderReset')} onclick={() => oninput(defaultValue as number)}>↺</button>
      {/if}
    </div>
  </div>
  <input
    class="range"
    type="range"
    {min}
    {max}
    {step}
    {value}
    aria-label={label}
    oninput={(e) => oninput(parseFloat((e.currentTarget as HTMLInputElement).value))}
  />
  <div class="scale"><span>{format(min)}</span><span>{format(max)}</span></div>
</div>

<style>
  .slider {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }
  .lbl {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  .ctrl {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .num {
    width: 76px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    text-align: right;
  }
  .unit {
    font-size: 12px;
    color: var(--muted);
    min-width: 26px;
  }
  .reset {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
  }
  .reset:hover {
    color: var(--text);
    border-color: var(--text);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--text);
    cursor: pointer;
    min-height: 24px;
  }
  .scale {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--faint);
    font-variant-numeric: tabular-nums;
  }
</style>
