import * as messages from './paraglide/messages.js';
import { locale, setLocale, initLocale, type Locale } from './state.svelte';

export type { Locale };
export { setLocale, initLocale, locales } from './state.svelte';

type MessageFn = (params?: Record<string, unknown>, options?: { languageTag?: Locale }) => string;

/**
 * Reaktif t() — hem `t('key')` hem `t.key()` şeklinde çağrılabilir.
 * Çağrıldığı yerde `locale` rune'unu okur, böylece dil değişince tüm
 * kullanımlar otomatik yeniden render edilir. Bilinmeyen key güvenli şekilde geri döndürülür.
 */
function translate(id: string, params?: Record<string, unknown>, options?: { languageTag?: Locale }): string {
	const fn = (messages as unknown as Record<string, MessageFn>)[id];
	return fn ? fn(params, { languageTag: locale.value, ...options }) : id;
}

export const t = new Proxy(translate, {
	get(_target, id: string | symbol) {
		if (typeof id === 'symbol') return (translate as unknown as Record<symbol, unknown>)[id];
		return (params?: Record<string, unknown>, options?: { languageTag?: Locale }) =>
			translate(id, params, options);
	}
}) as ((id: string, params?: Record<string, unknown>, options?: { languageTag?: Locale }) => string) & {
	[K: string]: MessageFn;
};
