<script lang="ts">
  import Icon from '../icons/Icon.svelte';

  let {
    title,
    detail,
    level = 'neutral',
    icon
  }: {
    title: string;
    detail: string;
    level?: 'success' | 'warning' | 'danger' | 'safe' | 'neutral';
    icon?: string;
  } = $props();

  const icons = {
    success: 'shield-check',
    safe: 'shield-check',
    warning: 'alert',
    danger: 'alert',
    neutral: 'info'
  } as const;
</script>

<div class="warn warn-{level}">
  <span class="wicon"><Icon name={icon ?? icons[level]} size={18} /></span>
  <div class="body">
    <div class="title">{title}</div>
    <div class="detail">{detail}</div>
  </div>
</div>

<style>
  .warn {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
  }
  .wicon {
    margin-top: 2px;
    flex-shrink: 0;
  }
  .title {
    font-weight: 700;
    font-size: 15px;
  }
  .detail {
    font-size: 13px;
    color: var(--muted);
    margin-top: 2px;
    line-height: 1.45;
  }
  .warn-success {
    background: color-mix(in srgb, var(--success) 12%, transparent);
    border-color: color-mix(in srgb, var(--success) 30%, transparent);
    color: var(--success);
  }
  .warn-safe {
    background: color-mix(in srgb, var(--success) 12%, transparent);
    border-color: color-mix(in srgb, var(--success) 30%, transparent);
    color: var(--success);
  }
  .warn-warning {
    background: color-mix(in srgb, var(--warning) 14%, transparent);
    border-color: color-mix(in srgb, var(--warning) 32%, transparent);
    color: var(--warning);
  }
  .warn-danger {
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    border-color: color-mix(in srgb, var(--danger) 32%, transparent);
    color: var(--danger);
  }
  .warn-neutral {
    background: var(--surface-2);
    border-color: var(--border);
    color: var(--text);
  }
  .warn-neutral .detail {
    color: var(--muted);
  }
</style>
