<script lang="ts">
  let { name, size = 18, class: cls = '' }: { name: string; size?: number; class?: string } =
    $props();
</script>

<svg class="icon {cls}" width={size} height={size} aria-hidden="true" focusable="false">
  <use href={'#ic-' + name} />
</svg>

<style>
  .icon {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style>
