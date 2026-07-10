<script lang="ts">
  import { conceptStore, closeConcept } from '../state/conceptStore';
  import { getConcept, type Concept } from '../engine/concepts';
  import { app } from '../state/appState.svelte';
  import { settings, getActiveProfileId } from '../engine/settings/settingsStore.svelte';
  import { selectAccount } from '../engine/selectors/selectAccount';
  import { resolveProfile } from '../engine/account/settingsResolver';
  import { fmtMoney, fmtPct } from '../utils/format';
  import Modal from './ui/Modal.svelte';
  import Icon from './icons/Icon.svelte';
  import { t } from '$lib/i18n';

  const stats = $derived(
    selectAccount({
      cash: app.portfolio.cash,
      holdings: app.portfolio.holdings,
      profileId: getActiveProfileId(),
      settings
    })
  );
  const profile = $derived(resolveProfile(settings, getActiveProfileId()));

  const liveSnapshot = $derived(
    t('conceptCollateralExample2', {
      cash: fmtMoney(stats.collateral.cashCollateral),
      securities: fmtMoney(stats.collateral.securitiesCollateral),
      total: fmtMoney(stats.collateral.totalCollateral),
      profile: profile.name,
      rate: fmtPct(profile.securitiesRateFactor * 100, 0)
    })
  );

  const liveBody = $derived(t('conceptCollateralBody2'));
  const liveInitialBody = $derived(t('conceptInitialBody2'));

  const rendered = $derived.by(() => {
    const c = $conceptStore.concept as Concept | null;
    if (!c) return null;
    if (c.key === 'collateral') return { body: liveBody, example: liveSnapshot };
    if (c.key === 'initial') return { body: liveInitialBody, example: c.example };
    return { body: c.body, example: c.example };
  });
</script>

{#if $conceptStore.concept && rendered}
  <Modal
    open={$conceptStore.open}
    eyebrow={t('conceptModalEyebrow')}
    title={$conceptStore.concept.title}
    onclose={closeConcept}
  >
    <p>{rendered.body}</p>
    <div class="example">
      <span class="exicon"><Icon name="bulb" size={16} /></span>
      <div>
        <div class="extitle">{t('conceptModalUsage')}</div>
        <div class="exbody" style="white-space: pre-line;">{rendered.example}</div>
      </div>
    </div>
  </Modal>
{/if}

<style>
  p {
    margin: 0 0 var(--space-4);
  }
  .example {
    display: flex;
    gap: var(--space-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }
  .exicon {
    color: var(--warning);
    flex-shrink: 0;
  }
  .extitle {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .exbody {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
  }
</style>
