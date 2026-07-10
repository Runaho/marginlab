import { browser } from '$app/environment';
import { DEFAULT_PORTFOLIO } from '../engine/presets';
import type { FinderConfig, Holding, PortfolioData } from '../engine/types';

export type Theme = 'light' | 'dark';

export interface PendingTrade {
  ticker: string;
  shares: number;
}

interface PersistShape {
  p: PortfolioData;
  s: string;
  f: FinderConfig;
  g: boolean;
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

export const app = $state({
  portfolio: clone(DEFAULT_PORTFOLIO) as PortfolioData,
  activeScenario: 'Peak',
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
  pendingTrade: null as PendingTrade | null
});

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

export function setPendingTrade(t: PendingTrade | null) {
  app.pendingTrade = t;
}

function serialize(): string {
  const shape: PersistShape = {
    p: app.portfolio,
    s: app.activeScenario,
    f: app.finder,
    g: app.guided
  };
  return btoa(encodeURIComponent(JSON.stringify(shape)));
}

export function hydrateFromHash() {
  if (!browser) return;
  const hash = location.hash;
  const m = hash.match(/#d=([^&]+)/);
  if (!m) return;
  try {
    const json = decodeURIComponent(atob(m[1]));
    const shape = JSON.parse(json) as PersistShape;
    if (shape.p) app.portfolio = shape.p;
    if (shape.s) app.activeScenario = shape.s;
    if (shape.f) Object.assign(app.finder, shape.f);
    if (typeof shape.g === 'boolean') app.guided = shape.g;
  } catch {
    // bozuk hash — yok say
  }
}

export function syncHash() {
  if (!browser) return;
  const next = '#d=' + serialize();
  if (location.hash !== next) history.replaceState(null, '', next);
}
