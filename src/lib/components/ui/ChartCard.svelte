<script lang="ts">
  import { tick } from 'svelte';
  import { browser } from '$app/environment';
  import Icon from '../icons/Icon.svelte';
  import { t } from '$lib/i18n';

  let {
    title,
    subtitle,
    chart,
    chartExpanded
  }: {
    title: string;
    subtitle?: string;
    chart: import('svelte').Snippet;
    chartExpanded?: import('svelte').Snippet;
  } = $props();

  let expanded = $state(false);
  let expandBtn = $state<HTMLButtonElement | null>(null);
  let dialogEl = $state<HTMLDivElement | null>(null);
  let closeBtn = $state<HTMLButtonElement | null>(null);

  async function open() {
    expanded = true;
    await tick();
    closeBtn?.focus();
  }

  function close() {
    expanded = false;
    expandBtn?.focus();
  }

  function focusables(): HTMLElement[] {
    if (!dialogEl) return [];
    return Array.from(
      dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
  }

  function onKey(e: KeyboardEvent) {
    if (!expanded) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === 'Tab') {
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !dialogEl?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Body scroll kilidi — modal açıkken arka plan kaymasın
  $effect(() => {
    if (!browser) return;
    if (expanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="chart-card">
  <div class="cc-head">
    <div class="cc-title">
      <h3>{title}</h3>
      {#if subtitle}<p class="cc-sub">{subtitle}</p>{/if}
    </div>
    <button class="cc-expand" onclick={open} aria-label={t('chartExpand')} title={t('chartExpand')} bind:this={expandBtn}>
      <Icon name="expand" size={15} />
    </button>
  </div>
  <div class="cc-chart">
    {@render chart()}
  </div>
</div>

{#if expanded}
  <div class="cc-backdrop" onclick={close} role="presentation"></div>
    <div class="cc-modal" role="dialog" aria-modal="true" aria-label={t('chartLargeView', { title })} bind:this={dialogEl}>
    <div class="cc-modal-head">
      <div>
        <h3>{title}</h3>
        {#if subtitle}<p class="cc-sub">{subtitle}</p>{/if}
      </div>
      <button class="cc-close" onclick={close} aria-label={t('commonClose')} bind:this={closeBtn}><Icon name="x" size={18} /></button>
    </div>
    <div class="cc-modal-chart">
      {#if chartExpanded}
        {@render chartExpanded()}
      {:else}
        {@render chart()}
      {/if}
    </div>
  </div>
{/if}

<style>
  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .cc-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-4);
  }
  .cc-title h3 {
    font-size: 18px;
    margin: 0;
  }
  .cc-sub {
    font-size: 13px;
    color: var(--muted);
    margin: 4px 0 0;
    line-height: 1.4;
  }
  .cc-expand {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: pointer;
    transition: color 150ms, border-color 150ms;
  }
  .cc-expand:hover {
    color: var(--text);
    border-color: var(--text);
  }
  .cc-chart {
    display: flex;
    justify-content: center;
  }
  /* Normal görünümde grafik genişliğini sınırla — geniş ekranda dev olmasın.
     Sadece responsive .chart (Bar/Line) hedeflenir; Donut sabit boyutludur. */
  .cc-chart :global(.chart) {
    max-width: 560px;
  }

  /* Modal */
  .cc-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 18, 14, 0.5);
    backdrop-filter: blur(4px);
    z-index: 90;
    animation: cc-fade 180ms ease;
  }
  .cc-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(900px, 94vw);
    max-height: 92vh;
    overflow: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    z-index: 100;
    padding: var(--space-6);
    animation: cc-pop 180ms var(--ease);
  }
  .cc-modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .cc-modal-head h3 {
    font-size: 22px;
    margin: 0;
  }
  .cc-close {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    cursor: pointer;
  }
  .cc-modal-chart {
    display: flex;
    justify-content: center;
  }
  /* Büyütülmüş grafik okunur kalsın ama viewport'u taşmasın */
  .cc-modal-chart :global(.chart) {
    max-height: 72vh;
  }
  @keyframes cc-fade {
    from { opacity: 0; }
  }
  @keyframes cc-pop {
    from { opacity: 0; transform: translate(-50%, -46%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .cc-backdrop,
    .cc-modal {
      animation: none;
    }
    .cc-expand {
      transition: none;
    }
  }
</style>
