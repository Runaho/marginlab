<script lang="ts">
  import Icon from '../icons/Icon.svelte';

  let {
    variant = 'primary',
    onclick,
    icon,
    disabled = false,
    type = 'button',
    children
  }: {
    variant?: 'primary' | 'secondary' | 'ghost';
    onclick?: () => void;
    icon?: string;
    disabled?: boolean;
    type?: 'button' | 'submit';
    children: import('svelte').Snippet;
  } = $props();
</script>

<button {type} class="btn btn-{variant}" {onclick} {disabled}>
  {#if icon}<Icon name={icon} size={18} />{/if}
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 46px;
    padding: 0 18px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      transform 180ms var(--ease),
      background 180ms ease,
      border-color 180ms ease;
  }
  .btn:active {
    transform: translateY(0);
  }
  .btn:not(:disabled):hover {
    transform: translateY(-1px);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-primary {
    background: var(--text);
    color: var(--inverse);
    border-color: var(--text);
  }
  .btn-secondary {
    background: var(--surface-2);
    color: var(--text);
    border-color: var(--border);
  }
  .btn-ghost {
    background: transparent;
    color: var(--text);
  }
</style>
