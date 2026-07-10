<script lang="ts">
  import { conceptStore, closeConcept } from '../state/conceptStore';
  import { getConcept, type Concept } from '../engine/concepts';
  import Modal from './ui/Modal.svelte';
  import Icon from './icons/Icon.svelte';
</script>

{#if $conceptStore.concept}
  <Modal
    open={$conceptStore.open}
    eyebrow="Kavram notu"
    title={$conceptStore.concept.title}
    onclose={closeConcept}
  >
    <p>{$conceptStore.concept.body}</p>
    <div class="example">
      <span class="exicon"><Icon name="bulb" size={16} /></span>
      <div>
        <div class="extitle">Üründe kullanımı</div>
        <div class="exbody">{$conceptStore.concept.example}</div>
      </div>
    </div>
  </Modal>
{/if}

<style>
  p {
    margin: 0 0 var(--space-4);
  }
  .example {
    display: flex;
    gap: var(--space-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }
  .exicon {
    color: var(--warning);
    flex-shrink: 0;
  }
  .extitle {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .exbody {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
  }
</style>
