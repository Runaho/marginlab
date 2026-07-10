<script lang="ts">
  import { app, toggleTheme } from '../../state/appState.svelte';
  import Icon from '../icons/Icon.svelte';
  import Sidebar from './Sidebar.svelte';
  import { t } from '$lib/i18n';
  import { onMount } from 'svelte';

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();

let drawerEl: HTMLElement | null = $state(null);
let lastFocused: HTMLElement | null = $state(null);

  function trapFocus(e: KeyboardEvent) {
    if (!drawerEl) return;
    const focusable = drawerEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
    } else if (e.key === 'Tab') {
      trapFocus(e);
    }
  }

  $effect(() => {
    if (open) {
      lastFocused = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      onMount(() => {
      (drawerEl as HTMLElement | null)?.focus();
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        document.body.style.overflow = '';
        lastFocused?.focus();
      };
    });
    }
  });
</script>

{#if open}
  <div class="backdrop" onclick={onclose} role="presentation"></div>
  <div class="drawer" bind:this={drawerEl} role="dialog" aria-modal="true" aria-label={t('drawerNav')} tabindex="-1">
    <div class="drawer-head">
      <div class="brand">
        <span class="mark">M</span>
        <span class="brand-text">MarginLab <span class="sub">/ {t('drawerNav')}</span></span>
      </div>
      <button class="x" onclick={onclose} aria-label={t('commonClose')}><Icon name="x" size={18} /></button>
    </div>
    <Sidebar onnav={onclose} />
    <button class="theme-btn" onclick={toggleTheme} aria-label={app.theme === 'dark' ? t('themeLight') : t('themeDark')}>
      <Icon name={app.theme === 'dark' ? 'sun' : 'moon'} size={18} />
      <span>{app.theme === 'dark' ? t('themeLight') : t('themeDark')}</span>
    </button>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 18, 14, 0.45);
    z-index: 75;
  }
  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(86vw, 360px);
    background: var(--bg);
    border-right: 1px solid var(--border);
    z-index: 80;
    padding: var(--space-4);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    animation: slide 200ms ease;
  }
  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .mark {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: var(--text);
    color: var(--inverse);
    display: grid;
    place-items: center;
    font-family: var(--font-display);
    font-size: 20px;
  }
  .brand-text {
    font-weight: 700;
    font-size: 16px;
  }
  .sub {
    color: var(--faint);
    font-weight: 500;
  }
  .x {
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
  .theme-btn {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: var(--radius-md);
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    font-weight: 600;
    cursor: pointer;
  }
  @keyframes slide {
    from {
      transform: translateX(-100%);
    }
  }
</style>