<script lang="ts">
  import { app, toggleTheme } from '../../state/appState.svelte';
  import Icon from '../icons/Icon.svelte';
  import Sidebar from './Sidebar.svelte';

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();
</script>

{#if open}
  <div class="backdrop" onclick={onclose} role="presentation"></div>
  <aside class="drawer" aria-label="Gezinme">
    <div class="drawer-head">
      <div class="brand">
        <span class="mark">M</span>
        <span class="brand-text">MarginCall <span class="sub">/ Gezinme</span></span>
      </div>
      <button class="x" onclick={onclose} aria-label="Kapat"><Icon name="x" size={18} /></button>
    </div>
    <Sidebar onnav={onclose} />
    <button class="theme-btn" onclick={toggleTheme}>
      <Icon name={app.theme === 'dark' ? 'sun' : 'moon'} size={18} />
      {app.theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
    </button>
  </aside>
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
