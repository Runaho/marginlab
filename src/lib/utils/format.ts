import { locale } from '$lib/i18n/state.svelte';
import { t } from '$lib/i18n';

const LOCALE_MAP: Record<string, string> = { tr: 'tr-TR', en: 'en-US' };

function loc(): string {
	return LOCALE_MAP[locale.value] ?? 'tr-TR';
}

export function fmtMoney(n: number, opts: { sign?: boolean } = {}): string {
	const v = isFinite(n) ? n : 0;
	const s = v.toLocaleString(loc(), {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	return (opts.sign && v > 0 ? '+' : '') + '$' + s;
}

export function fmtNum(n: number, digits = 2): string {
	const v = isFinite(n) ? n : 0;
	return v.toLocaleString(loc(), {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}

export function fmtPct(n: number, digits = 1): string {
	const v = isFinite(n) ? n : 0;
	return (
		(v > 0 ? '+' : '') +
		v.toLocaleString(loc(), {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		}) +
		'%'
	);
}

export function fmtShares(n: number): string {
	const v = isFinite(n) ? n : 0;
	return Math.round(v).toLocaleString(loc());
}

export function fmtDate(d: Date | string): string {
	const date = typeof d === 'string' ? new Date(d) : d;
	return date.toLocaleString(loc(), {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function levelLabel(level: 'safe' | 'warning' | 'danger'): string {
	return t(level === 'safe' ? 'levelSafe' : level === 'warning' ? 'levelWarning' : 'levelDanger');
}
