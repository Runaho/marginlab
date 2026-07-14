<script lang="ts">
  import '../app.css';
  import {
    app,
    applyTheme,
    hydrateFromStorage,
    syncStorage
  } from '$lib/state/appState.svelte';
  import { initLocale, locale } from '$lib/i18n/state.svelte';
  import { t } from '$lib/i18n';
  import IconSprite from '$lib/components/icons/IconSprite.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import MobileDrawer from '$lib/components/layout/MobileDrawer.svelte';
  import ConceptModal from '$lib/components/ConceptModal.svelte';
  import DecisionStrip from '$lib/components/layout/DecisionStrip.svelte';
  import GuidedToggle from '$lib/components/layout/GuidedToggle.svelte';

  let { children } = $props();
  let drawerOpen = $state(false);

  // İlk yüklemede localStorage'dan (veya eski #d= hash'inden tek seferlik) durumu geri yükle
  hydrateFromStorage();
  applyTheme();
  initLocale();

  // <html lang> özniteliğini locale ile senkron tut
  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale.value);
    }
  });

  // State değiştikçe localStorage'ı güncelle. URL temiz kalır; paylaşım
  // yalnızca Share butonu üzerinden explicit tetiklenir.
  $effect(() => {
    void app.portfolio;
    void app.activeScenario;
    void app.activeCustomScenarioId;
    void app.finder;
    void app.guided;
    void app.watchlist;
    void app.decisionLog;
    void app.currentTrade;
    void app.eduDone;
    void app.customScenarios;
    syncStorage();
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
      <div class="page-container">
        <DecisionStrip />
        {@render children()}
        <footer class="footer">
          <span>{t('footerDisclaimer')}</span>
          <span>© {year}</span>
        </footer>
      </div>
    </main>
  </div>
</div>

<MobileDrawer open={drawerOpen} onclose={() => (drawerOpen = false)} />
<ConceptModal />
<GuidedToggle />

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
    padding-block: var(--space-8);
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
      padding-block: var(--space-6);
    }
  }
  @media (max-width: 640px) {
    .main {
      padding-block: var(--space-4);
    }
    .footer {
      flex-direction: column;
      gap: 6px;
    }
  }
</style>
