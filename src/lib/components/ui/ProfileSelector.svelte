<script lang="ts">
  import { PROFILE_LIST } from '$lib/engine/marginProfile';
  import { settings, setActiveProfile } from '$lib/engine/settings/settingsStore.svelte';
  import { resolveProfile } from '$lib/engine/account/settingsResolver';
  import type { BrokerProfileId } from '$lib/engine/marginProfile';
  import Icon from '../icons/Icon.svelte';
  import { t } from '$lib/i18n';
  import { profileLabel, profileDesc } from '$lib/i18n/labels';

  let { compact = false }: { compact?: boolean } = $props();

  const active = $derived(resolveProfile(settings, settings.activeProfileId));

  function onSelect(e: Event) {
    const id = (e.currentTarget as HTMLSelectElement).value as BrokerProfileId;
    setActiveProfile(id);
  }
</script>

<div class="prof" class:compact>
    <label class="prof-label">
      <span class="pl-top"><Icon name="shield" size={14} /> {t('profileSelTitle')}</span>
      <select value={settings.activeProfileId} onchange={onSelect}>
        {#each PROFILE_LIST as p (p.id)}<option value={p.id}>{profileLabel(p.id)}</option>{/each}
      </select>
    </label>
    {#if !compact}
      <p class="prof-desc">{profileDesc(settings.activeProfileId)}</p>
      <p class="prof-note">{t('profileSelDisclaimer')}</p>
    {/if}
</div>

<style>
  .prof {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .prof-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  .pl-top {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .prof select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    font-size: 14px;
    color: var(--text);
  }
  .prof-desc {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
    line-height: 1.45;
  }
  .prof-note {
    font-size: 11px;
    color: var(--faint);
    margin: 0;
    line-height: 1.4;
  }
</style>
