<script lang="ts">
  import { app } from '$lib/state/appState.svelte';
  import Icon from '../icons/Icon.svelte';

  let { title, children }: { title: string; children: import('svelte').Snippet } = $props();
</script>

{#if app.guided}
  <div class="guided">
    <span class="gicon"><Icon name="bulb" size={16} /></span>
    <div>
      <div class="gtitle">{title}</div>
      <div class="gbody">{@render children()}</div>
    </div>
  </div>
{/if}

<style>
  .guided {
    display: flex;
    gap: var(--space-3);
    background: color-mix(in srgb, var(--warning) 10%, var(--surface));
    border: 1px dashed color-mix(in srgb, var(--warning) 45%, transparent);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-4);
  }
  .gicon {
    color: var(--warning);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .gtitle {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 2px;
  }
  .gbody {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
  }
</style>
