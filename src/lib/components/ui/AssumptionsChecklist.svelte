<script lang="ts">
  import { app } from '$lib/state/appState.svelte';
  import { fmtPct } from '$lib/utils/format';
  import Icon from '../icons/Icon.svelte';
  import { t } from '$lib/i18n';

  const items = $derived([
    {
      icon: 'alert',
      text: t('assumStatic'),
      strong: true
    },
    {
      icon: 'info',
      text: t('assumSource')
    },
    {
      icon: 'info',
      text: t('assumCollateral')
    },
    {
      icon: 'info',
      text: t('assumRate', { rate: fmtPct(app.portfolio.account.rate * 100, 1) })
    },
    {
      icon: 'info',
      text: t('assumMaint', { rate: fmtPct(app.portfolio.account.maintenanceMargin * 100, 0) })
    },
    {
      icon: 'info',
      text: t('assumScenarios', { active: app.activeScenario })
    },
    {
      icon: 'shield',
      text: t('assumBroker')
    }
  ]);
</script>

<details class="assume">
  <summary>
    <Icon name="shield" size={16} />
    <span>{t('assumTitle')}</span>
    <span class="chev"><Icon name="chevron" size={16} /></span>
  </summary>
  <ul>
    {#each items as it (it.text)}
      <li class:strong={it.strong}>
        <Icon name={it.icon} size={14} />
        <span>{it.text}</span>
      </li>
    {/each}
  </ul>
</details>

<style>
  .assume {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    margin-top: var(--space-4);
  }
  .assume summary {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 14px;
    list-style: none;
  }
  .assume summary::-webkit-details-marker {
    display: none;
  }
  .assume .chev {
    margin-left: auto;
    color: var(--muted);
    transition: transform 180ms var(--ease);
  }
  .assume[open] .chev {
    transform: rotate(180deg);
  }
  .assume ul {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .assume li {
    display: flex;
    gap: 8px;
    font-size: 13px;
    color: var(--muted);
    line-height: 1.45;
  }
  .assume li.strong {
    font-weight: 700;
    color: var(--danger);
  }
  .assume li :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
  }
</style>
