<script lang="ts">
  import Icon from '../icons/Icon.svelte';

  let {
    open,
    eyebrow,
    title,
    onclose,
    children
  }: {
    open: boolean;
    eyebrow?: string;
    title: string;
    onclose: () => void;
    children: import('svelte').Snippet;
  } = $props();

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) onclose();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div class="backdrop" onclick={onclose} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
    <div class="head">
      {#if eyebrow}<div class="eyebrow">{eyebrow}</div>{/if}
      <h3>{title}</h3>
      <button class="close" onclick={onclose} aria-label="Kapat"><Icon name="x" size={18} /></button>
    </div>
    <div class="body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 18, 14, 0.45);
    backdrop-filter: blur(4px);
    z-index: 90;
    animation: fade 180ms ease;
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(760px, 92vw);
    max-height: 90vh;
    overflow: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    z-index: 100;
    padding: var(--space-6);
    animation: pop 180ms var(--ease);
  }
  .head {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .head h3 {
    flex: 1;
    font-size: 24px;
  }
  .close {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: var(--text);
  }
  .body {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text);
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translate(-50%, -46%);
    }
  }
</style>
