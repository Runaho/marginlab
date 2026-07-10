<script lang="ts">
  import Icon from '../icons/Icon.svelte';

  let {
    label,
    value,
    hint,
    icon,
    level
  }: {
    label: string;
    value: string;
    hint?: string;
    icon?: string;
    level?: 'success' | 'warning' | 'danger' | 'safe' | 'neutral';
  } = $props();
</script>

<div class="kpi" class:bordered={level}>
  {#if level}<span class="edge edge-{level}"></span>{/if}
  <div class="label">{label}</div>
  <div class="value tabular">{value}</div>
  {#if hint}<div class="hint">{hint}</div>{/if}
  {#if icon}<span class="corner"><Icon name={icon} size={18} /></span>{/if}
</div>

<style>
  .kpi {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: hidden;
  }
  .label {
    font-size: 13px;
    color: var(--muted);
    font-weight: 600;
  }
  .value {
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
  }
  .hint {
    font-size: 13px;
    color: var(--muted);
  }
  .corner {
    position: absolute;
    top: 16px;
    right: 16px;
    color: var(--faint);
  }
  .edge {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
  }
  .edge-success {
    background: var(--success);
  }
  .edge-safe {
    background: var(--success);
  }
  .edge-warning {
    background: var(--warning);
  }
  .edge-danger {
    background: var(--danger);
  }
  .edge-neutral {
    background: var(--muted);
  }
</style>
