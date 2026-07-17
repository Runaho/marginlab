<script lang="ts">
  import { app, toggleTheme } from '../../state/appState.svelte';
  import Icon from '../icons/Icon.svelte';
  import LanguageMenu from './LanguageMenu.svelte';
  import ShareButton from './ShareButton.svelte';
  import { t } from '$lib/i18n';

  let { onmenu }: { onmenu: () => void } = $props();
</script>

<header class="topbar">
  <div class="left">
    <button class="menu" onclick={onmenu} aria-label={t('topbarMenu')}><Icon name="menu" size={20} /></button>
    <a href="/" class="brand">
      <span class="mark">M</span>
      <span class="brand-text">
        MarginLab
        <span class="sub">{t('topbarBrandSub')}</span>
      </span>
    </a>
  </div>
  <div class="utility" role="toolbar" aria-label={t('topbarLang')}>
    <LanguageMenu />
    <ShareButton />
    <button
      type="button"
      class="icon-btn"
      onclick={toggleTheme}
      aria-label={app.theme === 'dark' ? t('themeLight') : t('themeDark')}
      title={app.theme === 'dark' ? t('themeLight') : t('themeDark')}
    >
      <Icon name={app.theme === 'dark' ? 'sun' : 'moon'} size={18} />
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
    gap: var(--space-3);
    padding: 0 var(--space-4);
    background: color-mix(in srgb, var(--bg) 80%, transparent);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
    overflow: hidden;
  }
  .left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
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
  .utility {
    display: inline-flex;
    align-items: center;
    gap: 8px;
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
  .icon-btn:hover {
    background: var(--surface-3);
  }
  @media (max-width: 1180px) {
    .menu {
      display: grid;
    }
  }
  @media (max-width: 540px) {
    .topbar {
      padding: 0 var(--space-3);
      gap: var(--space-2);
    }
    .brand-text {
      min-width: 0;
      overflow: hidden;
    }
    .brand-text .sub {
      display: none;
    }
    .mark {
      width: 32px;
      height: 32px;
      font-size: 18px;
    }
  }
</style>
