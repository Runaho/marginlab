<script lang="ts">
  import Icon from '../icons/Icon.svelte';

  let {
    level = 'neutral',
    label,
    icon
  }: { level?: 'success' | 'warning' | 'danger' | 'safe' | 'neutral'; label: string; icon?: string } =
    $props();
</script>

<span class="badge badge-{level}">
  <span class="dot"></span>
  {#if icon}<Icon name={icon} size={14} />{/if}
  {label}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: currentColor;
  }
  .badge-success {
    color: var(--success);
    background: color-mix(in srgb, var(--success) 14%, transparent);
    border-color: color-mix(in srgb, var(--success) 35%, transparent);
  }
  .badge-safe {
    color: var(--success);
    background: color-mix(in srgb, var(--success) 14%, transparent);
    border-color: color-mix(in srgb, var(--success) 35%, transparent);
  }
  .badge-warning {
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 16%, transparent);
    border-color: color-mix(in srgb, var(--warning) 35%, transparent);
  }
  .badge-danger {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 14%, transparent);
    border-color: color-mix(in srgb, var(--danger) 35%, transparent);
  }
  .badge-neutral {
    color: var(--muted);
    background: var(--surface-3);
    border-color: var(--border);
  }
</style>
