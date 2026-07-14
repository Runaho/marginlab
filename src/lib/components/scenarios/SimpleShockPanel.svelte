<script lang="ts">
  import type { ScenarioSpec } from '$lib/engine/types';
  import RangeSlider from '$lib/components/ui/RangeSlider.svelte';
  import { fmtPct } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  let {
    spec = $bindable(),
    onchange
  }: { spec: Extract<ScenarioSpec, { kind: 'flat' }>; onchange?: (s: Extract<ScenarioSpec, { kind: 'flat' }>) => void } =
    $props();

  function update(patch: Partial<Extract<ScenarioSpec, { kind: 'flat' }>>) {
    spec = { ...spec, ...patch };
    onchange?.(spec);
  }
</script>

<div class="panel">
  <p class="hint">{t('simSimpleShockHelp')}</p>
  <div class="grid">
    <RangeSlider
      label={t('simTradeShock')}
      min={-1}
      max={3}
      step={0.05}
      value={spec.tradeShock}
      oninput={(v) => update({ tradeShock: v })}
      format={(v) => fmtPct(v * 100, 0)}
      defaultValue={-0.5}
    />
    <RangeSlider
      label={t('simPortfolioShock')}
      min={-1}
      max={2}
      step={0.05}
      value={spec.portfolioShock}
      oninput={(v) => update({ portfolioShock: v })}
      format={(v) => fmtPct(v * 100, 0)}
      defaultValue={-0.1}
    />
    <RangeSlider
      label={t('simDailyDrop')}
      min={-0.1}
      max={0.1}
      step={0.005}
      value={spec.dailyDrop}
      oninput={(v) => update({ dailyDrop: v })}
      format={(v) => `${fmtPct(v * 100, 1)} /d`}
      defaultValue={-0.03}
    />
    <RangeSlider
      label={t('simHoldingPeriod')}
      min={1}
      max={365}
      step={1}
      value={spec.days}
      oninput={(v) => update({ days: v })}
      format={(v) => `${v} ${t('unitDays')}`}
      defaultValue={30}
    />
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .hint {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3) var(--space-4);
  }
  @media (max-width: 720px) {
    .grid { grid-template-columns: 1fr; }
  }
</style>