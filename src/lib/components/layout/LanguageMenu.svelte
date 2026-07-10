<script lang="ts">
  import { locale, setLocale, type Locale } from '$lib/i18n/state.svelte';
  import { t } from '$lib/i18n';
  import Icon from '../icons/Icon.svelte';

  interface LangOption {
    id: Locale;
    label: string;
    nativeLabel: string;
    langAttr: string;
  }

  const LANGS: LangOption[] = [
    { id: 'en', label: 'English', nativeLabel: 'English', langAttr: 'en' },
    { id: 'tr', label: 'Türkçe', nativeLabel: 'Türkçe', langAttr: 'tr' }
  ];

  let open = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();
  let menuEl: HTMLUListElement | undefined = $state();
  let activeIndex = $state(0);

  const current = $derived(LANGS.find((l) => l.id === locale.value) ?? LANGS[0]);

  function toggle() {
    open = !open;
    if (open) {
      activeIndex = LANGS.findIndex((l) => l.id === locale.value);
      if (activeIndex < 0) activeIndex = 0;
    }
  }

  function close(returnFocus = true) {
    open = false;
    if (returnFocus) triggerEl?.focus();
  }

  function pick(id: Locale) {
    if (id !== locale.value) setLocale(id);
    close();
  }

  function onTriggerKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) open = true;
      activeIndex = LANGS.findIndex((l) => l.id === locale.value);
      if (activeIndex < 0) activeIndex = 0;
      queueMicrotask(() => menuEl?.querySelectorAll<HTMLButtonElement>('button[role="menuitemradio"]')[activeIndex]?.focus());
    }
  }

  function onMenuKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % LANGS.length;
      focusItem(activeIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + LANGS.length) % LANGS.length;
      focusItem(activeIndex);
    } else if (e.key === 'Home') {
      e.preventDefault();
      activeIndex = 0;
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      activeIndex = LANGS.length - 1;
      focusItem(activeIndex);
    } else if (e.key === 'Tab') {
      close(false);
    }
  }

  function focusItem(i: number) {
    const items = menuEl?.querySelectorAll<HTMLButtonElement>('button[role="menuitemradio"]');
    items?.[i]?.focus();
  }

  function onWindowClick(e: MouseEvent) {
    if (!open) return;
    const t = e.target as Node | null;
    if (t && triggerEl?.contains(t)) return;
    if (t && menuEl?.contains(t)) return;
    close(false);
  }
</script>

<svelte:window onclick={onWindowClick} />

<div class="lang" class:open>
  <button
    type="button"
    class="trigger"
    bind:this={triggerEl}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={t('topbarLang')}
    onclick={toggle}
    onkeydown={onTriggerKey}
  >
    <Icon name="globe" size={18} />
    <span class="label" lang={current.langAttr}>{current.nativeLabel}</span>
    <Icon name="chevron" size={14} />
  </button>

  {#if open}
    <ul
      class="menu"
      bind:this={menuEl}
      role="menu"
      aria-label={t('topbarLang')}
      onkeydown={onMenuKey}
    >
      {#each LANGS as l, i (l.id)}
        <li role="none">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={l.id === locale.value}
            class="item"
            class:active={l.id === locale.value}
            tabindex={i === activeIndex ? 0 : -1}
            lang={l.langAttr}
            onclick={() => pick(l.id)}
            onfocus={() => (activeIndex = i)}
          >
            <span class="check" aria-hidden="true">
              {#if l.id === locale.value}
                <Icon name="check" size={14} />
              {/if}
            </span>
            <span class="native">{l.nativeLabel}</span>
            <span class="code" aria-hidden="true">{l.id.toUpperCase()}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .lang {
    position: relative;
  }
  .trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .trigger:hover {
    background: var(--surface-3);
  }
  .trigger[aria-expanded='true'] {
    background: var(--surface-3);
    border-color: var(--text);
  }
  .label {
    line-height: 1;
  }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 200px;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px -12px color-mix(in srgb, var(--text) 40%, transparent);
    z-index: 70;
  }
  .item {
    width: 100%;
    display: grid;
    grid-template-columns: 18px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    background: transparent;
    border: 0;
    border-radius: 8px;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
  }
  .item:hover,
  .item:focus-visible {
    background: var(--surface-2);
  }
  .item.active {
    background: var(--surface-3);
    color: var(--text);
    font-weight: 700;
  }
  .check {
    display: inline-flex;
    width: 18px;
    height: 18px;
    align-items: center;
    justify-content: center;
    color: var(--text);
  }
  .native {
    line-height: 1;
  }
  .code {
    font-size: 11px;
    font-weight: 600;
    color: var(--faint);
    letter-spacing: 0.06em;
  }
  @media (max-width: 640px) {
    .trigger .label {
      display: none;
    }
    .trigger {
      width: 40px;
      padding: 0;
      justify-content: center;
    }
  }
</style>
