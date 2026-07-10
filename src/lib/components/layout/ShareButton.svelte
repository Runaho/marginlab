<script lang="ts">
  import { browser } from '$app/environment';
  import { buildShareUrl } from '$lib/state/appState.svelte';
  import { t } from '$lib/i18n';
  import Icon from '../icons/Icon.svelte';

  let feedback = $state<'idle' | 'copied' | 'failed'>('idle');
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function share() {
    if (!browser) return;
    const url = buildShareUrl();
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      // Eski tarayıcı / sandbox: prompt ile manuel kopyalama imkânı.
      window.prompt(t('topbarSharePrompt'), url);
      feedback = 'copied';
    } else {
      feedback = 'copied';
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (feedback = 'idle'), 2000);
  }
</script>

<button
  type="button"
  class="share-btn"
  onclick={share}
  aria-label={t('topbarSharePortfolio')}
  title={feedback === 'copied' ? t('topbarPortfolioShared') : t('topbarSharePortfolio')}
>
  <Icon name={feedback === 'copied' ? 'check' : 'share'} size={18} />
  {#if feedback === 'copied'}
    <span class="share-label">{t('topbarPortfolioShared')}</span>
  {/if}
</button>

<style>
  .share-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    height: 40px;
    padding: 0 12px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
  }
  .share-btn:hover {
    background: var(--surface-3);
  }
  .share-label {
    white-space: nowrap;
  }
</style>