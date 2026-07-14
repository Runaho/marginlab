import { browser } from '$app/environment';
import { DEFAULT_PORTFOLIO } from '../engine/presets';
import type { DecisionRecord, FinderConfig, Holding, PortfolioData, UserScenario, WatchlistItem } from '../engine/types';
import type { BrokerProfileId } from '../engine/marginProfile';
import { DEFAULT_PROFILE_ID, getProfile } from '../engine/marginProfile';
import { DEFAULT_COLLATERAL_RATE } from '../engine/config';
import { createLocalAppStateRepository, type AppStateShape, type WorkingTrade } from './portfolioRepository';
import { SCENARIO_LIMITS } from '../engine/types';

export type Theme = 'light' | 'dark';

/**
 * Geçici "in-flight" mesaj şemasının yerini "working draft" aldı:
 * kullanıcı bir ticker/shares/additionalCash/holdingDays kombinasyonu
 * planladığında burada yaşar; Simulator yazar, Scenarios + DecisionStrip +
 * MarginCallMap okur. #d= base64 payload'ında da taşınır (Share için).
 */
export type { WorkingTrade };
export type { UserScenario };

interface PersistShape {
  p: PortfolioData;
  s: string;
  f: FinderConfig;
  g: boolean;
  d: DecisionRecord[];
  w: WatchlistItem[];
  pr: BrokerProfileId;
  t: WorkingTrade | null;
  e: Record<number, boolean>;
  cs: UserScenario[];
  /** Custom senaryo aktif id; null veya yoksa app.activeScenario (preset adı) kullanılır. */
  ac: string | null;
}

function loadTheme(): Theme {
  if (!browser) return 'light';
  const t = localStorage.getItem('mc-theme');
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const repo = createLocalAppStateRepository();

export const app = $state({
  portfolio: clone(DEFAULT_PORTFOLIO) as PortfolioData,
  activeScenario: 'Peak',
  /** Custom senaryo aktifse id'si; yoksa null ve app.activeScenario (preset adı) kullanılır. */
  activeCustomScenarioId: null as string | null,
  finder: {
    budget: 300,
    riskTolerance: 'medium',
    goal: 'fit',
    mode: 'balanced',
    scope: 'selected',
    maxLot: 5
  } as FinderConfig,
  guided: true,
  theme: loadTheme(),
  currentTrade: null as WorkingTrade | null,
  decisionLog: [] as DecisionRecord[],
  watchlist: [] as WatchlistItem[],
  profile: DEFAULT_PROFILE_ID as BrokerProfileId,
  eduDone: {} as Record<number, boolean>,
  customScenarios: [] as UserScenario[],
  /** true olduğunda UI küçük bir uyarı gösterebilir (örn. ayarlar sıfırlandı). */
  persistenceError: false
});

/**
 * Aktif profil = settings.activeProfileId (tek kaynak).
 * Eski `app.profile` okumaları için geriye dönük uyumluluk sağlar;
 * yazma işlemleri settingsStore.setActiveProfile üzerinden yapılır.
 */
export function getActiveProfile(): BrokerProfileId {
  return app.profile;
}

/**
 * @deprecated app.profile artık tek kaynak değil. settingsStore.setActiveProfile kullanın.
 * Geriye dönük uyumluluk için bırakıldı.
 */
export function setProfile(id: BrokerProfileId) {
  app.profile = id;
}

export function setTheme(t: Theme) {
  app.theme = t;
  if (browser) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('mc-theme', t);
  }
}

export function toggleTheme() {
  setTheme(app.theme === 'dark' ? 'light' : 'dark');
}

export function applyTheme() {
  if (browser) document.documentElement.setAttribute('data-theme', app.theme);
}

export function setCash(cash: number) {
  app.portfolio.cash = cash;
}

export function setAccount(patch: Partial<PortfolioData['account']>) {
  Object.assign(app.portfolio.account, patch);
}

export function addHolding(h: Holding) {
  app.portfolio.holdings.push(h);
}

export function updateHolding(index: number, patch: Partial<Holding>) {
  if (app.portfolio.holdings[index]) Object.assign(app.portfolio.holdings[index], patch);
}

/** Kullanıcı bir pozisyonun teminat oranını override eder → kaynak 'user-override'. */
export function setHoldingCollateral(index: number, rate: number) {
  const h = app.portfolio.holdings[index];
  if (!h) return;
  h.collateral = Math.max(0, Math.min(1, rate));
  h.collateralSource = 'user-override';
}

/** Override'ı sıfırla → varsayımsal %75. */
export function resetHoldingCollateral(index: number) {
  const h = app.portfolio.holdings[index];
  if (!h) return;
  h.collateral = DEFAULT_COLLATERAL_RATE;
  h.collateralSource = 'default-assumption';
  h.excludeFromCollateral = false;
}

/** Gelişmiş Varsayımlar: pozisyonu collateral havuzundan hariç tut / dahil et. */
export function toggleExcludeCollateral(index: number) {
  const h = app.portfolio.holdings[index];
  if (!h) return;
  h.excludeFromCollateral = !h.excludeFromCollateral;
}

export function removeHolding(index: number) {
  app.portfolio.holdings.splice(index, 1);
}

export function setActiveScenario(name: string) {
  app.activeScenario = name;
}

export function setFinder(patch: Partial<FinderConfig>) {
  Object.assign(app.finder, patch);
}

export function setGuided(v: boolean) {
  app.guided = v;
}

export function loadPortfolio(data: PortfolioData) {
  app.portfolio = clone(data);
}

export function resetPortfolio() {
  app.portfolio = clone(DEFAULT_PORTFOLIO);
}

/** Kullanıcının üzerinde çalıştığı trade taslağı. Simulator yazar, diğerleri okur. */
export function setCurrentTrade(t: WorkingTrade | null) {
  app.currentTrade = t;
}

export function clearCurrentTrade() {
  app.currentTrade = null;
}

export function setPendingTrade(t: { ticker: string; shares: number } | null) {
  if (!t) {
    app.currentTrade = null;
    return;
  }
  app.currentTrade = {
    ticker: t.ticker,
    shares: t.shares,
    additionalCash: 0,
    holdingDays: 30,
    updatedAt: new Date().toISOString()
  };
}

/** Education step durumu: kalıcı, navigation arası yaşar. */
export function setEduDone(n: number, v: boolean) {
  if (v) app.eduDone[n] = true;
  else delete app.eduDone[n];
}

export function setPendingDecision(_ignored: never) {
  // Eski API: uyumluluk için no-op. Yeni kayıtlar addDecision üzerinden.
}

export function addDecision(r: DecisionRecord) {
  app.decisionLog = [r, ...app.decisionLog].slice(0, 20);
}

export function toggleWatchlist(ticker: string) {
  const idx = app.watchlist.findIndex((w) => w.ticker === ticker);
  if (idx >= 0) {
    app.watchlist.splice(idx, 1);
  } else {
    app.watchlist.push({ ticker, addedAt: new Date().toISOString() });
  }
}

export function isInWatchlist(ticker: string): boolean {
  return app.watchlist.some((w) => w.ticker === ticker);
}

/** Crypto-randomUUID polyfill (bazı eski tarayıcılar + SSR için deterministic fallback). */
export function newScenarioId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'sc-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Yeni custom scenario ekler. SCENARIO_LIMITS.maxCustomScenarios sınırını uygular. */
export function addCustomScenario(s: UserScenario): { ok: boolean; reason?: 'limit' } {
  if (app.customScenarios.length >= SCENARIO_LIMITS.maxCustomScenarios) {
    return { ok: false, reason: 'limit' };
  }
  app.customScenarios = [...app.customScenarios, s];
  return { ok: true };
}

export function updateCustomScenario(id: string, patch: Partial<UserScenario>): void {
  app.customScenarios = app.customScenarios.map((s) =>
    s.id === id ? ({ ...s, ...patch, id: s.id, updatedAt: new Date().toISOString() } as UserScenario) : s
  );
}

export function removeCustomScenario(id: string): void {
  app.customScenarios = app.customScenarios.filter((s) => s.id !== id);
}

export function getCustomScenario(id: string): UserScenario | undefined {
  return app.customScenarios.find((s) => s.id === id);
}

function toPersistShape(): PersistShape {
  return {
    p: app.portfolio,
    s: app.activeScenario,
    f: app.finder,
    g: app.guided,
    d: app.decisionLog,
    w: app.watchlist,
    pr: app.profile,
    t: app.currentTrade,
    e: app.eduDone,
    cs: app.customScenarios,
    ac: app.activeCustomScenarioId
  };
}

function applyShape(shape: PersistShape) {
  if (shape.p) app.portfolio = shape.p;
  if (shape.s) app.activeScenario = shape.s;
  if (shape.f) Object.assign(app.finder, shape.f);
  if (typeof shape.g === 'boolean') app.guided = shape.g;
  if (Array.isArray(shape.d)) app.decisionLog = shape.d;
  if (Array.isArray(shape.w)) app.watchlist = shape.w;
  if (shape.t && typeof shape.t === 'object') app.currentTrade = shape.t;
  if (shape.e && typeof shape.e === 'object') app.eduDone = shape.e as Record<number, boolean>;
  if (Array.isArray(shape.cs)) app.customScenarios = shape.cs;
  if (typeof shape.ac === 'string' || shape.ac === null) app.activeCustomScenarioId = shape.ac;
  app.profile = getProfile(shape.pr).id;
  if (app.activeCustomScenarioId && !app.customScenarios.some((s) => s.id === app.activeCustomScenarioId)) {
    app.activeCustomScenarioId = null;
  }
}

/**
 * localStorage'dan state'i yükler. Eski `#d=` URL hash'i varsa onu bir kerelik
 * import eder, localStorage'a yazar, hash'i temizler (geriye dönük uyumluluk).
 */
export function hydrateFromStorage() {
  if (!browser) return;
  const stored = repo.load();
  applyShape(stored as PersistShape);

  // Eski URL hash migration: kullanıcı #d=... ile geldiyse state'i içeri al,
  // localStorage'a yaz ve hash'i temizle. Sonraki reload localStorage'dan gelir.
  const hash = location.hash;
  const m = hash.match(/#d=([^&]+)/);
  if (m) {
    try {
      const json = decodeURIComponent(atob(m[1]));
      const shape = JSON.parse(json) as PersistShape;
      applyShape(shape);
      repo.save(toPersistShape());
    } catch {
      // bozuk hash — yok say
    }
    // Hash'i temizle; path değişmediği için SvelteKit router yeniden koşmaz.
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/**
 * Share URL üretir. setCurrentTrade + setFinder + ... yapan mutator'ların state'i
 * serialize eder, `#d=` payload'ı olarak base64 JSON'a çevirir. URL temiz kalır
 * (otomatik yazılmaz) — paylaşım yalnızca explicit bu fonksiyon çağrıldığında.
 */
export function buildShareUrl(): string {
  return location.origin + location.pathname + location.search + '#d=' + btoa(encodeURIComponent(JSON.stringify(toPersistShape())));
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * State değişikliklerini localStorage'a yazar. 250ms debounce — UI
 * akışını bloklamamak ve aynı render frame'inde birden çok write'ı
 * birleştirmek için.
 */
export function syncStorage() {
  if (!browser) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const ok = repo.save(toPersistShape());
    if (!ok) app.persistenceError = true;
    syncTimer = null;
  }, 250);
}

/** Eski hash API; yeni kod `syncStorage` çağırmalı. Geriye dönük uyumluluk için bırakıldı. */
export function syncHash() {
  syncStorage();
}

export function hydrateFromHash() {
  hydrateFromStorage();
}