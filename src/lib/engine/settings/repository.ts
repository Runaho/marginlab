import type { Settings } from './types';
import { seedSettings } from './defaults';

const KEY = 'mc-settings';
export const SETTINGS_VERSION = 1;

export interface SettingsRepository {
  load(): Settings;
  save(s: Settings): void;
  reset(): Settings;
  /** Saklı kaydı varsayılanlarla birleştirip güvenli bir Settings döndürür (migrasyon). */
  loadMigrated(): Settings;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Derin birleştirme: base varsayılan, override kullanıcı değeri kazanır. Diziler yerine override geçer. */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : (override as T));
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(override)) {
    const bv = (base as Record<string, unknown>)[k];
    const ov = override[k];
    if (isPlainObject(bv) && isPlainObject(ov)) {
      out[k] = deepMerge(bv, ov);
    } else {
      out[k] = ov;
    }
  }
  return out as T;
}

function migrate(stored: unknown): Settings {
  const fresh = seedSettings();
  if (!isPlainObject(stored) || (stored as Record<string, unknown>).version !== SETTINGS_VERSION) {
    // Eski/bozuk kayıt: güvenli default ile birleştir, eksik alanlar defaults'tan dolar.
    return deepMerge(fresh, stored);
  }
  return deepMerge(fresh, stored);
}

export function createLocalSettingsRepository(): SettingsRepository {
  const hasStorage = typeof localStorage !== 'undefined';
  return {
    load() {
      if (!hasStorage) return seedSettings();
      const raw = localStorage.getItem(KEY);
      if (!raw) return seedSettings();
      try {
        return JSON.parse(raw) as Settings;
      } catch {
        return seedSettings();
      }
    },
    loadMigrated() {
      if (!hasStorage) return seedSettings();
      const raw = localStorage.getItem(KEY);
      if (!raw) return seedSettings();
      try {
        return migrate(JSON.parse(raw));
      } catch {
        return seedSettings();
      }
    },
    save(s: Settings) {
      if (!hasStorage) return;
      localStorage.setItem(KEY, JSON.stringify(s));
    },
    reset() {
      if (hasStorage) localStorage.removeItem(KEY);
      return seedSettings();
    }
  };
}
