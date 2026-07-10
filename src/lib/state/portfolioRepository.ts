import type { DecisionRecord, FinderConfig, Holding, PortfolioData, WatchlistItem } from '../engine/types';
import type { BrokerProfileId } from '../engine/marginProfile';
import { DEFAULT_PROFILE_ID } from '../engine/marginProfile';
import { DEFAULT_PORTFOLIO } from '../engine/presets';

export const APP_STATE_KEY = 'mc-app-state';
export const APP_STATE_VERSION = 1;

/**
 * Working draft: kullanıcının üzerinde çalıştığı trade taslağı.
 * Simulator yazar, Scenarios + DecisionStrip + MarginCallMap okur.
 */
export interface WorkingTrade {
  ticker: string;
  shares: number;
  additionalCash: number;
  holdingDays: number;
  updatedAt: string;
}

/** Uygulamanın localStorage'a yazdığı payload şekli (version alanı yazılmaz). */
export interface AppStateShape {
  p: PortfolioData;
  s: string;
  f: FinderConfig;
  g: boolean;
  d: DecisionRecord[];
  w: WatchlistItem[];
  pr: BrokerProfileId;
  t: WorkingTrade | null;
  e: Record<number, boolean>;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cloneSeed(): AppStateShape {
  return {
    p: JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO)) as PortfolioData,
    s: 'Peak',
    f: { budget: 300, riskTolerance: 'medium', goal: 'fit', mode: 'balanced', scope: 'selected', maxLot: 5 },
    g: true,
    d: [],
    w: [],
    pr: DEFAULT_PROFILE_ID,
    t: null,
    e: {}
  };
}

/** Derin birleştirme: base = seed, override = kullanıcı verisi. Bozuk/eksik alanlarda defaults kazanır. */
function deepMergeShape(base: AppStateShape, override: unknown): AppStateShape {
  if (!isPlainObject(override)) return base;
  const o = override as Record<string, unknown>;
  return {
    p: o.p && isPlainObject(o.p) ? (o.p as unknown as PortfolioData) : base.p,
    s: typeof o.s === 'string' ? o.s : base.s,
    f: o.f && isPlainObject(o.f) ? { ...base.f, ...(o.f as unknown as FinderConfig) } : base.f,
    g: typeof o.g === 'boolean' ? o.g : base.g,
    d: Array.isArray(o.d) ? (o.d as DecisionRecord[]).slice(0, 20) : base.d,
    w: Array.isArray(o.w) ? (o.w as WatchlistItem[]) : base.w,
    pr: typeof o.pr === 'string' ? (o.pr as BrokerProfileId) : base.pr,
    t: o.t && isPlainObject(o.t) ? (o.t as unknown as WorkingTrade) : base.t,
    e: o.e && isPlainObject(o.e) ? (o.e as Record<number, boolean>) : base.e
  };
}

export interface AppStateRepository {
  load(): AppStateShape;
  save(s: AppStateShape): boolean;
  reset(): AppStateShape;
}

export function createLocalAppStateRepository(): AppStateRepository {
  const hasStorage = typeof localStorage !== 'undefined';
  return {
    load() {
      if (!hasStorage) return cloneSeed();
      const raw = localStorage.getItem(APP_STATE_KEY);
      if (!raw) return cloneSeed();
      try {
        const parsed = JSON.parse(raw);
        if (!isPlainObject(parsed)) return cloneSeed();
        return deepMergeShape(cloneSeed(), parsed);
      } catch {
        return cloneSeed();
      }
    },
    save(s: AppStateShape) {
      if (!hasStorage) return false;
      try {
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(s));
        return true;
      } catch (err) {
        // QuotaExceededError veya SecurityError: caller defaults'a düşmeli, console.warn yeterli.
        console.warn('[appState] localStorage save failed:', err);
        return false;
      }
    },
    reset() {
      if (hasStorage) localStorage.removeItem(APP_STATE_KEY);
      return cloneSeed();
    }
  };
}