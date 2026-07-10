<script lang="ts">
  import { app, setGuided } from '$lib/state/appState.svelte';
  import Icon from '../icons/Icon.svelte';
  import { t } from '$lib/i18n';
</script>

<button
  class="gtoggle"
  class:on={app.guided}
  onclick={() => setGuided(!app.guided)}
  aria-label={app.guided ? t('guidedOff') : t('guidedOn')}
  aria-pressed={app.guided}
>
  <Icon name="book" size={18} />
  <Icon name="chevron" size={16} class="gt-hint" />
  <span class="gt-label">{app.guided ? t('guidedOff') : t('guidedOn')}</span>
</button>

<style>
  .gtoggle {
    position: fixed;
    right: 0;
    top: 50%;
    /* edge-tab: pill'in ~%50'si görünür, kalanı viewport dışında */
    transform: translate(50%, -50%);
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-right: none;
    border-radius: var(--radius-md) 0 0 var(--radius-md);
    color: var(--muted);
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(20, 18, 14, 0.18);
    opacity: 0.7;
    z-index: 70;
    transition:
      transform 260ms var(--ease),
      opacity 260ms ease,
      color 260ms ease,
      background 260ms ease;
  }
  .gtoggle :global(.gt-hint) {
    opacity: 0.6;
    transition: transform 260ms var(--ease);
  }
  .gtoggle:hover :global(.gt-hint),
  .gtoggle:focus-visible :global(.gt-hint) {
    transform: rotate(90deg);
  }
  .gtoggle:hover,
  .gtoggle:focus-visible {
    transform: translate(0, -50%);
    opacity: 1;
    color: var(--text);
  }
  .gtoggle.on {
    color: var(--text);
    border-color: var(--text);
    opacity: 0.8;
  }
  .gtoggle.on:hover,
  .gtoggle.on:focus-visible {
    opacity: 1;
  }
  .gt-label {
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    opacity: 0;
    margin-left: 0;
    font-weight: 600;
    font-size: 14px;
    transition:
      max-width 260ms var(--ease),
      opacity 260ms ease,
      margin-left 260ms var(--ease);
  }
  .gtoggle:hover .gt-label,
  .gtoggle:focus-visible .gt-label {
    max-width: 220px;
    opacity: 1;
    margin-left: 8px;
  }
  @media (max-width: 640px) {
    .gtoggle {
      transform: translate(50%, 0);
      top: auto;
      bottom: 16px;
      min-width: 44px;
      min-height: 44px;
    }
    .gtoggle:hover,
    .gtoggle:focus-visible,
    .gtoggle:active {
      transform: translate(0, 0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .gtoggle,
    .gtoggle :global(.gt-hint) {
      transition: none;
    }
  }
</style>
