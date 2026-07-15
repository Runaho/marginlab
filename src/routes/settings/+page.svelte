<script lang="ts">
  import { settings, updateSettings, resetSettings, restoreDemoSettings } from '$lib/engine/settings/settingsStore.svelte';
  import { validateSettings } from '$lib/engine/settings/validate';
  import { seedSettings } from '$lib/engine/settings/defaults';
  import { app } from '$lib/state/appState.svelte';
  import { selectAccount } from '$lib/engine/selectors/selectAccount';
  import { fmtMoney, fmtPct } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import { profileLabel, profileDesc, scenarioLabel } from '$lib/i18n/labels';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import RangeSlider from '$lib/components/ui/RangeSlider.svelte';

  const issues = $derived(validateSettings(settings));
  const blocking = $derived(issues.filter((i) => i.level === 'error'));
  const warnings = $derived(issues.filter((i) => i.level === 'warning'));

  const profileId = $derived(settings.activeProfileId);
  const profile = $derived(settings.accountProfiles[profileId]);

  // Aktif profile'ın değerleri motorun kullandığı değerlerdir (tek kaynak).
  function setProfileField(field: 'initialMarginRate' | 'maintenanceMarginRate' | 'earlyWarningBufferRate' | 'securitiesRateFactor' | 'cashCollateralRate' | 'defaultEligibleEquityRate', v: number) {
    updateSettings((s) => {
      s.accountProfiles[s.activeProfileId][field] = v;
    });
  }
  // Global defaults = gerçek fallback: profil bulunamadığında veya alanı eksikse.
  // (Phase 1 kararı: artık "sadece yeni profil seed" değil, "bilinmeyen profile erişiminde de fallback".)
  function setGlobal(field: 'initialMarginRate' | 'maintenanceMarginRate' | 'annualMarginRate' | 'earlyWarningBufferRate', v: number) {
    updateSettings((s) => {
      s.globalDefaults[field] = v;
    });
  }
  function setCost(field: 'annualMarginRate' | 'commissionRate' | 'commissionMin' | 'commissionPerShare' | 'spreadRate' | 'secFeeRate' | 'custodyRate' | 'currencyConversionCost', v: number) {
    updateSettings((s) => {
      s.costModel[field] = v;
    });
  }
  function setRisk(field: 'concentrationThreshold' | 'portfolioMaxConcentration', v: number) {
    updateSettings((s) => {
      s.collateralRisk[field] = v;
    });
  }
  function setActive(id: string) {
    updateSettings((s) => {
      s.activeProfileId = id as typeof s.activeProfileId;
    });
  }

  // Değişiklik özeti: aktif profildeki mevcut değerler ile seed defaults arasındaki fark.
  // "Default" = seedSettings() ilk üretim değerleri (gerçek tek kaynak).
  const activeProfileDefaults = $derived(settings.accountProfiles[profileId] && defaultsProfile());

  function defaultsProfile() {
    // seedSettings'in başlangıç üretim değerlerini, settingsStore'a bağlanmadan hesapla.
    // Tek seferlik hesaplama — slider/select değiştikçinde değişmez.
    return defaultSnapshot();
  }

  // defaultSnapshot: seedSettings'in ilk ürettiği profil değerlerini döndürür.
  // (Dinamik import yerine doğrudan local cache.)
  const _seedDefaults = (() => {
    const s = seedSettings();
    const p = s.accountProfiles[s.activeProfileId];
    return {
      initialMarginRate: p.initialMarginRate,
      maintenanceMarginRate: p.maintenanceMarginRate,
      earlyWarningBufferRate: p.earlyWarningBufferRate,
      securitiesRateFactor: p.securitiesRateFactor,
      cashCollateralRate: p.cashCollateralRate,
      defaultEligibleEquityRate: p.defaultEligibleEquityRate
    };
  })();

  function defaultSnapshot() {
    return _seedDefaults;
  }

  const changes = $derived.by(() => {
    const out: Array<{ key: string; from: string; to: string; label: string }> = [];
    const p = profile;
    const d = _seedDefaults;
    if (p.initialMarginRate !== d.initialMarginRate) {
      out.push({ key: 'settingsInitMarginFor', label: t('settingsInitMarginFor', { name: profileLabel(p.id) }), from: fmtPct(d.initialMarginRate * 100, 0), to: fmtPct(p.initialMarginRate * 100, 0) });
    }
    if (p.maintenanceMarginRate !== d.maintenanceMarginRate) {
      out.push({ key: 'settingsMaintMarginFor', label: t('settingsMaintMarginFor', { name: profileLabel(p.id) }), from: fmtPct(d.maintenanceMarginRate * 100, 0), to: fmtPct(p.maintenanceMarginRate * 100, 0) });
    }
    if (p.earlyWarningBufferRate !== d.earlyWarningBufferRate) {
      out.push({ key: 'settingsEwFor', label: t('settingsEwFor', { name: profileLabel(p.id) }), from: fmtPct(d.earlyWarningBufferRate * 100, 0), to: fmtPct(p.earlyWarningBufferRate * 100, 0) });
    }
    if (p.securitiesRateFactor !== d.securitiesRateFactor) {
      out.push({ key: 'settingsSecFactor', label: t('settingsSecFactor'), from: fmtPct(d.securitiesRateFactor * 100, 0), to: fmtPct(p.securitiesRateFactor * 100, 0) });
    }
    return out;
  });

  // Etkilenen alanlar: değişiklik sonrası kullanılabilir collateral ve buying power delta.
  const impact = $derived.by(() => {
    const stats = selectAccount({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      profileId: profileId,
      settings
    });
    const before = {
      availableCollateral: stats.collateral.totalCollateral,
      buyingPower: stats.buyingPower
    };
    // Yalnızca securitiesRateFactor değiştiğinde collateral delta'sı olur.
    let afterCollateral = before.availableCollateral;
    let afterBuyingPower = before.buyingPower;
    if (profile.securitiesRateFactor !== _seedDefaults.securitiesRateFactor) {
      const newSec = stats.collateral.securitiesCollateral / _seedDefaults.securitiesRateFactor * profile.securitiesRateFactor;
      afterCollateral = stats.collateral.cashCollateral + newSec;
      afterBuyingPower = profile.initialMarginRate > 0 ? afterCollateral / profile.initialMarginRate : 0;
    }
    return {
      collateralDelta: afterCollateral - before.availableCollateral,
      buyingPowerDelta: afterBuyingPower - before.buyingPower
    };
  });
</script>

<PageHeader eyebrow={t('settingsEyebrow')} title={t('settingsTitle')} desc={t('settingsDesc')} />

{#if blocking.length}
  <WarningBox level="danger" title={t('settingsErrCount', { n: blocking.length })} detail={blocking.map((i) => `${i.path}: ${i.message}`).join(' · ')} />
{:else if warnings.length}
  <WarningBox level="warning" title={t('settingsWarnCount', { n: warnings.length })} detail={warnings.map((i) => `${i.path}: ${i.message}`).join(' · ')} />
{:else}
  <WarningBox level="success" title={t('settingsConsistent')} detail={t('settingsConsistentDetail')} />
{/if}

<GuidedNote title={t('settingsSingleSource')}>
  {t('settingsGuidedBody')}
</GuidedNote>

<!-- Tier 1: Aktif hesap profili (açık) -->
<section class="card tier-active">
  <h3>{t('settingsTierActive')}</h3>
  <p class="tier-help">{t('settingsTierActiveHelp')}</p>
  <div class="profiles">
    {#each Object.values(settings.accountProfiles) as p (p.id)}
      <button class="pbtn" class:active={p.id === profileId} onclick={() => setActive(p.id)}>
        <strong>{profileLabel(p.id)}</strong>
        <span>{profileDesc(p.id)}</span>
      </button>
    {/each}
  </div>
  <div class="grid2">
    <RangeSlider label={t('settingsInitMarginFor', { name: profileLabel(profile.id) })} min={0.1} max={0.9} step={0.05} value={profile.initialMarginRate} oninput={(v) => setProfileField('initialMarginRate', v)} format={(v) => fmtPct(v * 100, 0)} defaultValue={_seedDefaults.initialMarginRate} />
    <RangeSlider label={t('settingsMaintMarginFor', { name: profileLabel(profile.id) })} min={0.1} max={0.5} step={0.05} value={profile.maintenanceMarginRate} oninput={(v) => setProfileField('maintenanceMarginRate', v)} format={(v) => fmtPct(v * 100, 0)} defaultValue={_seedDefaults.maintenanceMarginRate} />
    <RangeSlider label={t('settingsEwFor', { name: profileLabel(profile.id) })} min={0.01} max={0.2} step={0.01} value={profile.earlyWarningBufferRate} oninput={(v) => setProfileField('earlyWarningBufferRate', v)} format={(v) => fmtPct(v * 100, 0)} defaultValue={_seedDefaults.earlyWarningBufferRate} />
    <RangeSlider label={t('settingsSecFactor')} min={0.5} max={1} step={0.05} value={profile.securitiesRateFactor} oninput={(v) => setProfileField('securitiesRateFactor', v)} format={(v) => fmtPct(v * 100, 0)} defaultValue={_seedDefaults.securitiesRateFactor} />
    <RangeSlider label={t('settingsCashCollateralRate')} min={0} max={1} step={0.05} value={profile.cashCollateralRate} oninput={(v) => setProfileField('cashCollateralRate', v)} format={(v) => fmtPct(v * 100, 0)} defaultValue={_seedDefaults.cashCollateralRate} />
    <RangeSlider label={t('settingsDefaultEquity')} min={0} max={1} step={0.05} value={profile.defaultEligibleEquityRate} oninput={(v) => setProfileField('defaultEligibleEquityRate', v)} format={(v) => fmtPct(v * 100, 0)} defaultValue={_seedDefaults.defaultEligibleEquityRate} />
  </div>
  <p class="meta">{t('settingsCollateralMode')} <strong>{profile.collateralMode}</strong> · {t('settingsFundingPolicy')} <strong>{profile.fundingPolicy}</strong> · {t('settingsCurrency')} {profile.currency}</p>

  <!-- Değişiklik özeti -->
  <div class="changes" class:empty={changes.length === 0}>
    <div class="changes-title">{t('settingsUnsavedTitle')}</div>
    {#if changes.length === 0}
      <p class="changes-empty">{t('settingsUnsavedEmpty')}</p>
    {:else}
      <ul class="changes-list">
        {#each changes as ch (ch.key)}
          <li><span class="ch-key">{ch.label}</span><span class="ch-arrow">{ch.from} → {ch.to}</span></li>
        {/each}
      </ul>
      <div class="changes-impact">
        <div class="ch-impact-title">{t('settingsImpactHeader')}</div>
        <ul>
          <li>{t('settingsImpactCollateral', { delta: fmtMoney(impact.collateralDelta, { sign: true }) })}</li>
          <li>{t('settingsImpactBuyingPower', { delta: fmtMoney(impact.buyingPowerDelta, { sign: true }) })}</li>
        </ul>
      </div>
    {/if}
  </div>
</section>

<!-- Tier 2: Gelişmiş risk ayarları (kapalı) -->
<details class="card tier">
  <summary><strong>{t('settingsTierAdvanced')}</strong><span class="tier-help-inline">{t('settingsTierAdvancedHelp')}</span></summary>

  <h4 class="sub">{t('settingsCostModel')}</h4>
  <div class="grid2">
    <RangeSlider label={t('simAnnualRate')} min={0} max={0.2} step={0.005} value={settings.costModel.annualMarginRate} oninput={(v) => setCost('annualMarginRate', v)} format={(v) => fmtPct(v * 100, 1)} defaultValue={0.08} />
    <label>{t('settingsCommissionPerShare')}<input type="number" min="0" step="0.01" value={settings.costModel.commissionPerShare} oninput={(e) => setCost('commissionPerShare', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} /></label>
    <label>{t('settingsCommissionMin')}<input type="number" min="0" step="0.01" value={settings.costModel.commissionMin} oninput={(e) => setCost('commissionMin', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} /></label>
    <label>{t('settingsSpreadRate')}<input type="number" min="0" step="0.0001" value={settings.costModel.spreadRate} oninput={(e) => setCost('spreadRate', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} /></label>
    <label>{t('settingsSecFeeRate')}<input type="number" min="0" step="0.00001" value={settings.costModel.secFeeRate} oninput={(e) => setCost('secFeeRate', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} /></label>
    <label>{t('settingsCustodyRate')}<input type="number" min="0" step="0.0001" value={settings.costModel.custodyRate} oninput={(e) => setCost('custodyRate', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} /></label>
  </div>
  <p class="meta">{t('settingsCommissionModel')} <strong>{settings.costModel.commissionModel}</strong> · {t('settingsAccrual')} {settings.costModel.accrual} · {t('settingsFxCost')} {fmtPct(settings.costModel.currencyConversionCost * 100, 2)}</p>

  <h4 class="sub">{t('settingsCollateralRisk')}</h4>
  <div class="grid2">
    <label>{t('settingsConcThreshold')}<input type="number" min="0" max="1" step="0.01" value={settings.collateralRisk.concentrationThreshold} oninput={(e) => setRisk('concentrationThreshold', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} /></label>
    <label>{t('settingsPortfolioMaxConc')}<input type="number" min="1" step="0.1" value={settings.collateralRisk.portfolioMaxConcentration} oninput={(e) => setRisk('portfolioMaxConcentration', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} /></label>
  </div>
  <div class="rate-map">
    {#each Object.entries(settings.collateralRisk.instrumentTypeRates) as [k, v] (k)}
      <span class="rate-chip">{k}: {fmtPct(v * 100, 0)}</span>
    {/each}
  </div>
  <p class="meta">{t('settingsEligibilityRule')} {t(settings.collateralRisk.eligibilityRules)} · {t('settingsVolHaircut')} {settings.collateralRisk.volatilityHaircutOverride} · {t('settingsLiqHaircut')} {settings.collateralRisk.liquidityHaircutOverride}</p>

  <h4 class="sub">{t('settingsScenarioThresholds')}</h4>
  <div class="grid2">
    <RangeSlider label={t('settingsMcBuffer')} min={0} max={0.1} step={0.005} value={settings.scenarioEngine.riskThresholds.marginCallBufferRate} oninput={(v) => updateSettings((s) => { s.scenarioEngine.riskThresholds.marginCallBufferRate = v; })} format={(v) => fmtPct(v * 100, 1)} defaultValue={0} />
  </div>
  <p class="meta">{t('settingsActiveScenarioSet')} {settings.scenarioEngine.scenarioSet.map((s) => scenarioLabel(s)).join(', ')}</p>
</details>

<!-- Tier 3: Sistem varsayılanları (kapalı, admin) -->
<details class="card tier">
  <summary><strong>{t('settingsTierSystem')}</strong><span class="tier-help-inline">{t('settingsTierSystemHelp')}</span></summary>

  <h4 class="sub">{t('settingsGlobalDefaults')}</h4>
  <p class="meta">{t('settingsGlobalNote')}</p>
  <div class="grid2">
    <RangeSlider label={t('settingsInitMarginGlobal')} min={0.1} max={0.9} step={0.05} value={settings.globalDefaults.initialMarginRate} oninput={(v) => setGlobal('initialMarginRate', v)} format={(v) => fmtPct(v * 100, 0)} defaultValue={0.5} />
    <RangeSlider label={t('settingsMaintMarginGlobal')} min={0.1} max={0.5} step={0.05} value={settings.globalDefaults.maintenanceMarginRate} oninput={(v) => setGlobal('maintenanceMarginRate', v)} format={(v) => fmtPct(v * 100, 0)} defaultValue={0.25} />
    <RangeSlider label={t('settingsAnnualRateGlobal')} min={0} max={0.2} step={0.005} value={settings.globalDefaults.annualMarginRate} oninput={(v) => setGlobal('annualMarginRate', v)} format={(v) => fmtPct(v * 100, 1)} defaultValue={0.08} />
  </div>

  <h4 class="sub">{t('settingsDataSource')}</h4>
  <div class="grid2">
    <label>{t('settingsMarketSource')}<input value={settings.dataSource.marketDataSource} readonly /></label>
    <label>{t('settingsPortfolioSource')}<input value={settings.dataSource.portfolioSourceMetadata} readonly /></label>
    <label>{t('settingsFallback')}<input value={t(settings.dataSource.fallbackBehavior)} readonly /></label>
    <label>{t('settingsStalePolicy')}<input value={settings.dataSource.stalePolicy} readonly /></label>
  </div>
  <p class="meta">{t('settingsLastUpdated')} {settings.dataSource.lastUpdated}</p>
</details>

<div class="actions">
  <button class="btn-ghost" onclick={() => resetSettings()}>{t('settingsReset')}</button>
  <button class="btn-primary" onclick={() => restoreDemoSettings()}>{t('settingsRestoreDemo')}</button>
</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    margin-bottom: var(--space-5);
  }
  .card h3 {
    font-size: 20px;
    margin-bottom: var(--space-2);
  }
  .tier-help {
    font-size: 13px;
    color: var(--muted);
    margin: 0 0 var(--space-4);
    line-height: 1.5;
  }
  .tier-help-inline {
    font-size: 12px;
    color: var(--muted);
    font-weight: 400;
    margin-left: 8px;
  }
  .tier > summary {
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 20px;
    list-style: none;
    padding: 4px 0;
  }
  .tier > summary::-webkit-details-marker { display: none; }
  .tier > summary::before {
    content: '+';
    display: inline-block;
    width: 22px;
    font-weight: 700;
    color: var(--muted);
  }
  .tier[open] > summary::before { content: '−'; }
  .tier > .sub {
    font-family: var(--font-display);
    font-size: 16px;
    margin: var(--space-4) 0 var(--space-2);
  }
  .profiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .pbtn {
    text-align: left;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pbtn.active {
    border-color: var(--text);
    box-shadow: inset 0 0 0 1px var(--text);
  }
  .pbtn span {
    font-size: 12px;
    color: var(--muted);
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  label input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  label input[readonly] {
    color: var(--faint);
  }
  .meta {
    font-size: 12px;
    color: var(--faint);
    margin: var(--space-3) 0 0;
    line-height: 1.5;
  }
  .rate-map {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .rate-chip {
    font-size: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 10px;
  }
  .changes {
    margin-top: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-2);
  }
  .changes.empty { color: var(--muted); }
  .changes-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .changes-empty { margin: 0; font-size: 13px; }
  .changes-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .changes-list li {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 4px 0;
    border-bottom: 1px solid var(--border);
  }
  .changes-list li:last-child { border-bottom: 0; }
  .ch-key { font-weight: 600; }
  .ch-arrow { font-variant-numeric: tabular-nums; color: var(--text); font-weight: 600; }
  .changes-impact {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }
  .ch-impact-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .changes-impact ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .changes-impact li {
    font-size: 13px;
    color: var(--text);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    margin-bottom: var(--space-6);
  }
  .btn-ghost,
  .btn-primary {
    border-radius: 999px;
    padding: 10px 18px;
    font-weight: 700;
    cursor: pointer;
    font-size: 14px;
  }
  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
  }
  .btn-primary {
    background: var(--text);
    border: 1px solid var(--text);
    color: var(--surface);
  }
  @media (max-width: 720px) {
    .grid2 { grid-template-columns: 1fr; }
  }
</style>
