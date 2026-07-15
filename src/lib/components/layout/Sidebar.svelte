<script lang="ts">
  import { page } from '$app/stores';
  import { buildNav } from './nav';
  import Icon from '../icons/Icon.svelte';
  import { t } from '$lib/i18n';

  let { onnav }: { onnav?: () => void } = $props();

  const active = $derived($page.url.pathname);
  const navItems = $derived(buildNav(t));
</script>

<nav class="nav">
  <div class="group-title">{t('navWorkspace')}</div>
  {#each navItems as item (item.href)}
    {@const isActive = item.href === '/' ? active === '/' : active.startsWith(item.href)}
    <a
      href={item.href}
      class="nav-link"
      class:active={isActive}
      onclick={() => onnav?.()}
    >
      <Icon name={item.icon} size={18} />
      <span class="nav-label">
        <span class="nav-text">{item.label}</span>
        <span class="nav-step">{t('commonStep', { step: item.step, stage: item.stage })}</span>
      </span>
    </a>
  {/each}
  <details class="side-card">
    <summary><span class="eyebrow">{t('navAboutTitle')}</span></summary>
    <p>
      {t('navAboutBody')}
    </p>
  </details>
</nav>

<style>
  .nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .group-title {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--faint);
    font-weight: 600;
    padding: 0 12px 4px;
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    border-radius: var(--radius-md);
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
    border: 1px solid transparent;
    transition:
      background 180ms ease,
      border-color 180ms ease;
  }
  .nav-link:hover {
    background: var(--surface-2);
    border-color: var(--border);
  }
  .nav-label {
    display: flex;
    flex-direction: column;
    font-weight: 600;
    font-size: 15px;
  }
  .nav-step {
    font-size: 11px;
    font-weight: 500;
    color: var(--faint);
    letter-spacing: 0.02em;
  }
  .nav-link.active .nav-step {
    color: color-mix(in srgb, var(--inverse) 70%, transparent);
  }
  .nav-link.active {
    background: var(--text);
    color: var(--inverse);
    border-color: var(--text);
  }
  .side-card {
    margin-top: var(--space-4);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }
  .side-card summary {
    cursor: pointer;
    list-style: none;
  }
  .side-card summary::-webkit-details-marker {
    display: none;
  }
  .side-card[open] summary {
    margin-bottom: 6px;
  }
  .side-card p {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
    margin: 6px 0 0;
  }
</style>
