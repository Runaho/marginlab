<script lang="ts">
  import { app, toggleTheme, setGuided } from '../../state/appState.svelte';
  import Icon from '../icons/Icon.svelte';

  let { onmenu }: { onmenu: () => void } = $props();
</script>

<header class="topbar">
  <div class="left">
    <button class="menu" onclick={onmenu} aria-label="Menü"><Icon name="menu" size={20} /></button>
    <a href="/" class="brand">
      <span class="mark">M</span>
      <span class="brand-text">
        MarginCall
        <span class="sub">Portföy Risk Karar Stüdyosu</span>
      </span>
    </a>
  </div>
  <div class="actions">
    <button
      class="icon-btn"
      class:on={app.guided}
      onclick={() => setGuided(!app.guided)}
      aria-label="Rehber modu"
      title="Rehber modu"
    >
      <Icon name="book" size={18} />
      <span class="sr-only">Rehber</span>
    </button>
    <button class="icon-btn" onclick={toggleTheme} aria-label="Tema değiştir">
      <Icon name={app.theme === 'dark' ? 'sun' : 'moon'} size={18} />
      <span class="sr-only">Tema</span>
    </button>
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    height: var(--top-h);
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-6);
    background: color-mix(in srgb, var(--bg) 80%, transparent);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
  }
  .left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .menu {
    display: none;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    width: 40px;
    height: 40px;
    place-items: center;
    cursor: pointer;
    color: var(--text);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: var(--text);
  }
  .mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--text);
    color: var(--inverse);
    display: grid;
    place-items: center;
    font-family: var(--font-display);
    font-size: 22px;
  }
  .brand-text {
    display: flex;
    flex-direction: column;
    font-weight: 700;
    font-size: 17px;
    line-height: 1.05;
  }
  .sub {
    font-size: 11px;
    font-weight: 500;
    color: var(--faint);
    letter-spacing: 0.02em;
  }
  .icon-btn {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: var(--text);
  }
  .icon-btn.on {
    background: var(--text);
    color: var(--inverse);
    border-color: var(--text);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  @media (max-width: 960px) {
    .menu {
      display: grid;
    }
  }
</style>
