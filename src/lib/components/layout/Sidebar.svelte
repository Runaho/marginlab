<script lang="ts">
  import { page } from '$app/stores';
  import { NAV } from './nav';
  import Icon from '../icons/Icon.svelte';

  let { onnav }: { onnav?: () => void } = $props();

  const active = $derived($page.url.pathname);
</script>

<nav class="nav">
  <div class="group-title">Çalışma Alanı</div>
  {#each NAV as item (item.href)}
    {@const isActive = item.href === '/' ? active === '/' : active.startsWith(item.href)}
    <a
      href={item.href}
      class="nav-link"
      class:active={isActive}
      onclick={() => onnav?.()}
    >
      <Icon name={item.icon} size={18} />
      <span class="nav-label">{item.label}</span>
    </a>
  {/each}
  <div class="side-card">
    <div class="eyebrow">Bu ürün ne yapar?</div>
    <p>
      MarginCall, portföyünü <strong>teminat motoru</strong> olarak okuyan bir karar
      stüdyosudur. Trade′i açmadan önce maliyetini, riskini ve portföyün taşıyıp
      taşıyamayacağını gösterir.
    </p>
  </div>
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
  .side-card p {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
    margin: 6px 0 0;
  }
</style>
