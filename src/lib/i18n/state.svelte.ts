import { browser } from '$app/environment';
import { availableLanguageTags, setLanguageTag, type AvailableLanguageTag } from './paraglide/runtime.js';

export type Locale = AvailableLanguageTag;
export const locales = availableLanguageTags as readonly Locale[];

export const locale = $state<{ value: Locale }>({ value: 'tr' });

const STORAGE_KEY = 'marginlab.locale';

export function setLocale(tag: Locale): void {
	locale.value = tag;
	setLanguageTag(tag);
	if (browser) localStorage.setItem(STORAGE_KEY, tag);
}

export function initLocale(): void {
	if (!browser) return;
	const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
	const fromNav = navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'tr';
	setLocale(stored && (locales as readonly string[]).includes(stored) ? stored : fromNav);
}
