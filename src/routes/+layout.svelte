<script lang="ts">
  import '../app.css';
  import {
    app,
    applyTheme,
    hydrateFromHash,
    syncHash
  } from '$lib/state/appState.svelte';
  import IconSprite from '$lib/components/icons/IconSprite.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import MobileDrawer from '$lib/components/layout/MobileDrawer.svelte';
  import ConceptModal from '$lib/components/ConceptModal.svelte';

  let { children } = $props();
  let drawerOpen = $state(false);

  // İlk yüklemede hash'ten durumu geri yükle
  hydrateFromHash();
  applyTheme();

  // State değiştikçe hash'i güncelle (kalıcı olmayan, URL tabanlı durum)
  $effect(() => {
    void app.portfolio;
    void app.activeScenario;
    void app.finder;
    void app.guided;
    syncHash();
  });

  const year = new Date().getFullYear();
</script>

<IconSprite />

<div class="shell">
  <Topbar onmenu={() => (drawerOpen = true)} />
  <div class="body">
    <aside class="sidebar">
      <Sidebar />
    </aside>
    <main class="main">
      {@render children()}
      <footer class="footer">
        <span>MarginCall — Eğitim amaçlı simülatör. Gerçek yatırım tavsiyesi değildir.</span>
        <span>© {year}</span>
      </footer>
    </main>
  </div>
</div>

<MobileDrawer open={drawerOpen} onclose={() => (drawerOpen = false)} />
<ConceptModal />

<style>
  .shell {
    min-height: 100vh;
  }
  .body {
    display: grid;
    grid-template-columns: var(--side-w) 1fr;
  }
  .sidebar {
    position: sticky;
    top: var(--top-h);
    align-self: start;
    height: calc(100vh - var(--top-h));
    overflow-y: auto;
    border-right: 1px solid var(--border);
    padding: var(--space-6) var(--space-4);
  }
  .main {
    min-width: 0;
    padding: var(--space-8) var(--space-10);
    max-width: 1200px;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    margin-top: var(--space-16);
    padding-top: var(--space-6);
    border-top: 1px solid var(--border);
    font-size: 13px;
    color: var(--faint);
  }
  @media (max-width: 1180px) {
    .body {
      grid-template-columns: 1fr;
    }
    .sidebar {
      display: none;
    }
    .main {
      padding: var(--space-6) var(--space-6);
    }
  }
  @media (max-width: 640px) {
    .main {
      padding: var(--space-4);
    }
    .footer {
      flex-direction: column;
      gap: 6px;
    }
  }
</style>
