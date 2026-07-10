<script lang="ts">
  import Icon from '../icons/Icon.svelte';

  let {
    title,
    detail,
    level = 'neutral',
    icon,
    actions
  }: {
    title: string;
    detail: string;
    level?: 'success' | 'warning' | 'danger' | 'safe' | 'neutral';
    icon?: string;
    actions?: import('svelte').Snippet;
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
      {#if actions}<div class="actions">{@render actions()}</div>{/if}
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
    /* Kritik risk metni düşük kontrastlı olmamalı — okunur gövde rengi */
    color: var(--text);
    margin-top: 2px;
    line-height: 1.45;
  }
  /* Semantic token'lar: pozitif/attention/critical/info — WCAG hedefli fg */
  .warn-success,
  .warn-safe {
    background: var(--positive-bg);
    border-color: var(--positive-border);
    color: var(--positive-fg);
  }
  .warn-warning {
    background: var(--attention-bg);
    border-color: var(--attention-border);
    color: var(--attention-fg);
  }
  .warn-danger {
    background: var(--critical-bg);
    border-color: var(--critical-border);
    color: var(--critical-fg);
  }
  .warn-neutral {
    background: var(--neutral-bg);
    border-color: var(--neutral-border);
    color: var(--text);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .actions :global(a),
  .actions :global(button) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid currentColor;
    background: transparent;
    color: inherit;
    font-weight: 600;
    font-size: 13px;
    text-decoration: none;
    cursor: pointer;
  }
</style>
