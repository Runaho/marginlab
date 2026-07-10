<script lang="ts">
  import Icon from '../icons/Icon.svelte';
  import { t } from '$lib/i18n';

  let {
    label,
    value,
    hint,
    icon,
    level,
    kind
  }: {
    label: string;
    value: string;
    hint?: string;
    icon?: string;
    level?: 'success' | 'warning' | 'danger' | 'safe' | 'neutral';
    kind?: 'result' | 'alert' | 'education' | 'action';
  } = $props();

  const kindTag: Record<string, string> = {
    result: t('kpiResult'),
    alert: t('kpiAlert'),
    education: t('kpiEducation'),
    action: t('kpiAction')
  };
</script>

<div class="kpi" class:bordered={level} class:kpi-result={kind === 'result'} class:kpi-alert={kind === 'alert'} class:kpi-education={kind === 'education'} class:kpi-action={kind === 'action'}>
  {#if level}<span class="edge edge-{level}"></span>{/if}
  {#if kind}<span class="kind kind-{kind}">{kindTag[kind]}</span>{/if}
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
  .kind {
    display: inline-block;
    align-self: flex-start;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: 4px;
  }
  .kind-result {
    color: var(--muted);
    background: var(--surface-3);
  }
  .kind-alert {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 14%, transparent);
  }
  .kind-education {
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 14%, transparent);
  }
  .kind-action {
    color: var(--success);
    background: color-mix(in srgb, var(--success) 14%, transparent);
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
