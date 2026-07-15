<script lang="ts">
  import { tick } from 'svelte';
  import { browser } from '$app/environment';
  import Icon from '../icons/Icon.svelte';
  import { t } from '$lib/i18n';

  let {
    open,
    eyebrow,
    title,
    onclose,
    wide = false,
    children
  }: {
    open: boolean;
    eyebrow?: string;
    title: string;
    onclose: () => void;
    wide?: boolean;
    children: import('svelte').Snippet;
  } = $props();

  let dialogEl = $state<HTMLDivElement | null>(null);
  let closeBtn = $state<HTMLButtonElement | null>(null);
  let prevFocused: HTMLElement | null = null;

  function focusables(): HTMLElement[] {
    if (!dialogEl) return [];
    return Array.from(
      dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
  }

  function onKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      onclose();
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

  // Açılışta odağı içeri al, kapanışta tetikleyen öğeye geri dön + body scroll kilidi
  $effect(() => {
    if (!browser) return;
    if (open) {
      prevFocused = document.activeElement as HTMLElement | null;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      tick().then(() => closeBtn?.focus());
      return () => {
        document.body.style.overflow = prevOverflow;
        prevFocused?.focus?.();
      };
    }
  });
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div class="backdrop" onclick={onclose} role="presentation"></div>
  <div class="modal" class:wide role="dialog" aria-modal="true" aria-label={title} bind:this={dialogEl}>
    <div class="head">
      {#if eyebrow}<div class="eyebrow">{eyebrow}</div>{/if}
      <h3>{title}</h3>
      <button class="close" onclick={onclose} aria-label={t('commonClose')} bind:this={closeBtn}><Icon name="x" size={18} /></button>
    </div>
    <div class="body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 18, 14, 0.45);
    backdrop-filter: blur(4px);
    z-index: 90;
    animation: fade 180ms ease;
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(760px, 92vw);
    max-height: 90vh;
    overflow: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    z-index: 100;
    padding: var(--space-6);
    animation: pop 180ms var(--ease);
  }
  .modal.wide {
    width: min(1080px, 96vw);
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--space-2) var(--space-3);
    margin-bottom: var(--space-4);
  }
  .head .eyebrow {
    flex-basis: 100%;
  }
  .head h3 {
    flex: 1;
    font-size: 24px;
  }
  .close {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: var(--text);
  }
  .body {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text);
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translate(-50%, -46%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .backdrop,
    .modal {
      animation: none;
    }
  }
</style>
