<script lang="ts">
  import {
    app,
    addCustomScenario,
    removeCustomScenario,
    updateCustomScenario,
    newScenarioId
  } from '$lib/state/appState.svelte';
  import { SCENARIO_LIMITS, type AnchorPoint, type PathInterpolation, type UserScenario, userScenarioToSpec } from '$lib/engine/types';
  import { PATH_PRESETS, getPreset } from '$lib/engine/scenarioPresets';
  import { t } from '$lib/i18n';
  import Icon from '$lib/components/icons/Icon.svelte';

  import SimpleShockPanel from './SimpleShockPanel.svelte';
  import PathEditorChart from './PathEditorChart.svelte';
  import PathTableEditor from './PathTableEditor.svelte';
  import SelectedPointForm from './SelectedPointForm.svelte';

  type Mode = 'simple' | 'path';

  let mode: Mode = $state('path');

  // Draft state — tek kaynak; UI'da 3 görünüm (slider/tablo/chart) senkronize okur.
  let draftName: string = $state('');
  let draftHoldingPeriod: number = $state(30);
  let draftInterpolation: PathInterpolation = $state('linear');

  // Simple
  let draftTradeShock: number = $state(-0.5);
  let draftPortfolioShock: number = $state(-0.1);
  let draftDailyDrop: number = $state(-0.03);

  // Path
  let draftTradePath: AnchorPoint[] = $state([
    { day: 0, changePct: 0 },
    { day: 30, changePct: 0 }
  ]);
  let draftPortfolioPath: AnchorPoint[] = $state([
    { day: 0, changePct: 0 },
    { day: 30, changePct: 0 }
  ]);

  let selected: { series: 'trade' | 'portfolio'; day: number } | null = $state(null);

  let banner = $state<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  function applyPreset(id: string) {
    const p = getPreset(id);
    if (!p) return;
    draftTradePath = p.tradePath.map((a) => ({ ...a }));
    draftPortfolioPath = p.portfolioPath.map((a) => ({ ...a }));
    draftHoldingPeriod = p.tradePath[p.tradePath.length - 1].day || 30;
    selected = null;
    banner = { kind: 'info', text: t('simPresetApplied', { name: t(p.nameKey) }) };
  }

  function switchMode(next: Mode) {
    mode = next;
    selected = null;
    if (next === 'simple' && draftTradePath.length > 0) {
      // Simple mode'a geçerken son trade path noktasını seed olarak kullan
      const last = draftTradePath[draftTradePath.length - 1];
      draftTradeShock = last ? last.changePct : -0.5;
    }
  }

  function resetDraft() {
    draftName = '';
    draftHoldingPeriod = 30;
    draftInterpolation = 'linear';
    draftTradeShock = -0.5;
    draftPortfolioShock = -0.1;
    draftDailyDrop = -0.03;
    draftTradePath = [
      { day: 0, changePct: 0 },
      { day: 30, changePct: 0 }
    ];
    draftPortfolioPath = [
      { day: 0, changePct: 0 },
      { day: 30, changePct: 0 }
    ];
    selected = null;
    banner = { kind: 'info', text: t('simResetDone') };
  }

  function saveDraft() {
    const name = draftName.trim();
    if (!name) {
      banner = { kind: 'error', text: t('simSaveNameRequired') };
      return;
    }
    if (app.customScenarios.length >= SCENARIO_LIMITS.maxCustomScenarios) {
      banner = { kind: 'error', text: t('simSaveLimitReached', { max: SCENARIO_LIMITS.maxCustomScenarios }) };
      return;
    }
    const now = new Date().toISOString();
    const id = newScenarioId();
    if (mode === 'simple') {
      const s: UserScenario = {
        id,
        kind: 'simple',
        name,
        tradeShock: draftTradeShock,
        portfolioShock: draftPortfolioShock,
        dailyDrop: draftDailyDrop,
        days: draftHoldingPeriod,
        createdAt: now,
        updatedAt: now
      };
      const res = addCustomScenario(s);
      if (!res.ok) {
        banner = { kind: 'error', text: t('simSaveLimitReached', { max: SCENARIO_LIMITS.maxCustomScenarios }) };
        return;
      }
    } else {
      // Anchor validasyonu: day 0 ve holdingPeriod anchor'ları zorunlu
      const tradePath = ensureEndpoints(draftTradePath, draftHoldingPeriod);
      const portfolioPath = ensureEndpoints(draftPortfolioPath, draftHoldingPeriod);
      const s: UserScenario = {
        id,
        kind: 'path',
        name,
        basedOnScenarioId: null,
        tradePath,
        portfolioPath,
        interpolation: draftInterpolation,
        holdingPeriod: draftHoldingPeriod,
        createdAt: now,
        updatedAt: now,
        settingsVersion: '2'
      };
      const res = addCustomScenario(s);
      if (!res.ok) {
        banner = { kind: 'error', text: t('simSaveLimitReached', { max: SCENARIO_LIMITS.maxCustomScenarios }) };
        return;
      }
    }
    banner = { kind: 'success', text: t('simSavedAs', { name }) };
    draftName = '';
  }

  function ensureEndpoints(path: AnchorPoint[], holding: number): AnchorPoint[] {
    let p = [...path];
    if (!p.some((a) => a.day === 0)) p = [{ day: 0, changePct: 0 }, ...p];
    if (!p.some((a) => a.day === holding)) p = [...p, { day: holding, changePct: p[p.length - 1]?.changePct ?? 0 }];
    // Auto-sort
    p = p.sort((a, b) => a.day - b.day);
    // Dedup same day (keep last)
    const seen = new Set<number>();
    p = p.filter((a) => {
      if (seen.has(a.day)) return false;
      seen.add(a.day);
      return true;
    });
    return p;
  }

  function updatePoint(series: 'trade' | 'portfolio', day: number, patch: Partial<AnchorPoint>) {
    const target = series === 'trade' ? draftTradePath : draftPortfolioPath;
    const next = target.map((p) => (p.day === day ? { ...p, ...patch } : p));
    if (series === 'trade') draftTradePath = next;
    else draftPortfolioPath = next;
  }

  function deletePoint(series: 'trade' | 'portfolio', day: number) {
    if (day === 0 || day === draftHoldingPeriod) return;
    const target = series === 'trade' ? draftTradePath : draftPortfolioPath;
    const next = target.filter((p) => p.day !== day);
    if (series === 'trade') draftTradePath = next;
    else draftPortfolioPath = next;
    selected = null;
  }

  // Mevcut custom senaryoları yüklemek için (edit modunda henüz implement edilmedi — read-only list)
</script>

<section class="csb card">
  <header class="head">
    <h3>{t('simBuilderTitle')}</h3>
    <p class="desc">{t('simBuilderDesc')}</p>
  </header>

  <div class="modes" role="tablist" aria-label={t('simBuilderModeLabel')}>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'simple'}
      class:active={mode === 'simple'}
      onclick={() => switchMode('simple')}
    >
      {t('simBuilderModeSimple')}
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'path'}
      class:active={mode === 'path'}
      onclick={() => switchMode('path')}
    >
      {t('simBuilderModePath')}
    </button>
  </div>

  {#if mode === 'simple'}
    <SimpleShockPanel
      spec={{ kind: 'flat', tradeShock: draftTradeShock, portfolioShock: draftPortfolioShock, dailyDrop: draftDailyDrop, days: draftHoldingPeriod }}
      onchange={(s) => {
        draftTradeShock = s.tradeShock;
        draftPortfolioShock = s.portfolioShock;
        draftDailyDrop = s.dailyDrop;
        draftHoldingPeriod = s.days;
      }}
    />
  {:else}
    <div class="path-controls">
      <label class="ctrl">
        <span class="lbl">{t('simPathHoldingPeriod')}</span>
        <input
          type="number"
          min="1"
          max="365"
          step="1"
          value={draftHoldingPeriod}
          oninput={(e) => {
            const v = parseInt((e.currentTarget as HTMLInputElement).value, 10) || 30;
            draftHoldingPeriod = Math.max(1, Math.min(365, v));
            // Son anchor day'i holdingPeriod'u aşıyorsa clamp et
            draftTradePath = draftTradePath.map((p) => ({ ...p, day: Math.min(p.day, draftHoldingPeriod) }));
            draftPortfolioPath = draftPortfolioPath.map((p) => ({ ...p, day: Math.min(p.day, draftHoldingPeriod) }));
            // Yeni holdingPeriod'da endpoint yoksa ekle
            draftTradePath = ensureEndpoints(draftTradePath, draftHoldingPeriod);
            draftPortfolioPath = ensureEndpoints(draftPortfolioPath, draftHoldingPeriod);
          }}
        />
        <span class="unit">{t('unitDays')}</span>
      </label>
      <label class="ctrl">
        <span class="lbl">{t('simPathInterpolation')}</span>
        <select bind:value={draftInterpolation}>
          <option value="linear">{t('simPathInterpLinear')}</option>
          <option value="step">{t('simPathInterpStep')}</option>
        </select>
      </label>
      <label class="ctrl preset-ctrl">
        <span class="lbl">{t('simPathApplyPreset')}</span>
        <select
          onchange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            if (v) {
              applyPreset(v);
              (e.currentTarget as HTMLSelectElement).value = '';
            }
          }}
        >
          <option value="">{t('simPathPresetChoose')}</option>
          {#each PATH_PRESETS as p (p.id)}
            <option value={p.id}>{t(p.nameKey)}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="path-layout">
      <div class="chart-col">
        <PathEditorChart
          bind:tradePath={draftTradePath}
          bind:portfolioPath={draftPortfolioPath}
          bind:interpolation={draftInterpolation}
          holdingPeriod={draftHoldingPeriod}
          selected={selected}
          onSelect={(s) => (selected = s)}
          onChange={() => {}}
        />
      </div>
      <div class="form-col">
        <SelectedPointForm
          series={selected?.series ?? null}
          anchor={selected ? ((selected.series === 'trade' ? draftTradePath : draftPortfolioPath).find((p) => p.day === selected?.day) ?? null) : null}
          holdingPeriod={draftHoldingPeriod}
          onUpdate={updatePoint}
          onDelete={deletePoint}
        />
      </div>
    </div>

    <div class="tables">
      <PathTableEditor
        series="trade"
        bind:path={draftTradePath}
        holdingPeriod={draftHoldingPeriod}
      />
      <PathTableEditor
        series="portfolio"
        bind:path={draftPortfolioPath}
        holdingPeriod={draftHoldingPeriod}
      />
    </div>
  {/if}

  <div class="save-row">
    <label class="name-input">
      <span class="lbl">{t('simSaveNameLabel')}</span>
      <input
        type="text"
        maxlength="40"
        placeholder={t('simSaveNamePlaceholder')}
        bind:value={draftName}
        aria-label={t('simSaveNameLabel')}
      />
    </label>
    <button type="button" class="btn-secondary" onclick={resetDraft}>
      <Icon name="x" size={14} /> {t('simReset')}
    </button>
    <button type="button" class="btn-primary" onclick={saveDraft} disabled={app.customScenarios.length >= SCENARIO_LIMITS.maxCustomScenarios}>
      <Icon name="check" size={14} /> {t('simSave')}
    </button>
  </div>

  {#if banner}
    <div class="banner banner-{banner.kind}" role="status" aria-live="polite">
      {banner.text}
    </div>
  {/if}

  {#if app.customScenarios.length > 0}
    <details class="saved">
      <summary>{t('simSavedCount', { count: app.customScenarios.length })}</summary>
      <ul>
        {#each app.customScenarios as s (s.id)}
          <li>
            <span class="nm">{s.name}</span>
            <span class="meta">
              {s.kind === 'simple'
                ? t('simSavedSimpleMeta', { ts: fmtPctSimple(s.tradeShock), ps: fmtPctSimple(s.portfolioShock), d: s.days })
                : t('simSavedPathMeta', { anchors: s.tradePath.length, hp: s.holdingPeriod })}
            </span>
            <button type="button" class="rm" aria-label={t('simDeleteAria', { name: s.name })} onclick={() => removeCustomScenario(s.id)}>
              <Icon name="x" size={12} />
            </button>
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</section>

<script module lang="ts">
  // Helper for display formatting (module scope to keep template tidy)
  function fmtPctSimple(v: number): string {
    const n = (v * 100).toFixed(0);
    return (v > 0 ? '+' : '') + n + '%';
  }
</script>

<style>
  .csb {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .head h3 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 22px;
    margin: 0 0 4px;
  }
  .desc {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .modes {
    display: inline-flex;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px;
    gap: 4px;
    align-self: flex-start;
  }
  .modes button {
    background: transparent;
    border: none;
    color: var(--muted);
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }
  .modes button.active {
    background: var(--text);
    color: var(--inverse);
  }
  .path-controls {
    display: grid;
    grid-template-columns: 1fr 1fr 2fr;
    gap: var(--space-3);
    align-items: end;
  }
  .ctrl {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  .ctrl input,
  .ctrl select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 10px;
    font-size: 13px;
    color: var(--text);
  }
  .unit {
    font-size: 10px;
    color: var(--faint);
  }
  .path-layout {
    display: grid;
    grid-template-columns: 8fr 4fr;
    gap: var(--space-4);
  }
  .tables {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
  @media (max-width: 960px) {
    .path-controls { grid-template-columns: 1fr; }
    .path-layout { grid-template-columns: 1fr; }
    .tables { grid-template-columns: 1fr; }
  }
  .save-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--space-3);
    align-items: end;
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }
  .name-input {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  .name-input input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text);
  }
  .btn-primary,
  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid var(--text);
  }
  .btn-primary {
    background: var(--text);
    color: var(--inverse);
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    background: transparent;
    color: var(--text);
  }
  .banner {
    font-size: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  .banner-success {
    background: color-mix(in srgb, var(--success) 12%, var(--surface));
    border-color: var(--success);
    color: var(--text);
  }
  .banner-error {
    background: color-mix(in srgb, var(--danger) 12%, var(--surface));
    border-color: var(--danger);
    color: var(--text);
  }
  .banner-info {
    background: var(--surface-2);
    color: var(--muted);
  }
  .saved {
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }
  .saved summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
  }
  .saved ul {
    list-style: none;
    padding: 0;
    margin: var(--space-2) 0 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .saved li {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
  }
  .nm { font-weight: 700; color: var(--text); }
  .meta { color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
  .rm {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 3px 5px;
    cursor: pointer;
    color: var(--muted);
  }
  .rm:hover { color: var(--danger); border-color: var(--danger); }
</style>