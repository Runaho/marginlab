<script lang="ts">
  import type { CollateralSource } from '$lib/engine/marginProfile';
  import { collateralSourceLabel } from '$lib/i18n/labels';

  let { source, rate }: { source: CollateralSource; rate?: number } = $props();

  const tone: Record<CollateralSource, string> = {
    'broker-data': 'ok',
    'default-assumption': 'assumed',
    'user-override': 'user',
    unavailable: 'off',
    unknown: 'warn'
  };

  const label = $derived(collateralSourceLabel(source, rate ?? 0));
</script>

<span class="cbadge {tone[source]}" title={label}>
  {label}
</span>

<style>
  .cbadge {
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid var(--border);
    white-space: nowrap;
  }
  .ok {
    color: var(--success);
    border-color: color-mix(in srgb, var(--success) 40%, var(--border));
  }
  .assumed {
    color: var(--muted);
  }
  .user {
    color: var(--text);
    border-color: var(--text);
  }
  .off {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 40%, var(--border));
  }
  .warn {
    color: var(--warning);
    border-color: color-mix(in srgb, var(--warning) 45%, var(--border));
  }
</style>
