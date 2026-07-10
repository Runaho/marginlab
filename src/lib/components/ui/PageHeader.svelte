<script lang="ts">
  let {
    eyebrow,
    title,
    desc,
    children
  }: {
    eyebrow?: string;
    title: string;
    desc?: string;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<header class="page-head">
  {#if eyebrow}<div class="eyebrow">{eyebrow}</div>{/if}
  <h1>{title}</h1>
  {#if desc}<p class="desc">{desc}</p>{/if}
  {#if children}<div class="actions">{@render children()}</div>{/if}
</header>

<style>
  .page-head {
    margin-bottom: var(--space-8);
  }
  .page-head h1 {
    font-size: clamp(30px, 4vw, 44px);
    margin-top: 4px;
  }
  .desc {
    margin: var(--space-3) 0 0;
    max-width: 70ch;
    color: var(--muted);
    font-size: 16px;
    line-height: 1.55;
  }
  .actions {
    margin-top: var(--space-4);
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
</style>
