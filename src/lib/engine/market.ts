import type { Holding, Sector, WatchlistItem } from './types';
import marketData from '../data/marketData.json';
import { betaFor, sectorFor } from './config';
import { t as _t } from '$lib/i18n';
const t = _t as unknown as (key: string, params?: Record<string, unknown>) => string;

export { betaFor, sectorFor };

export interface MarketStock {
  company: string;
  ticker: string;
  exchange: string;
  currency: string;
  category: string;
  price: number;
  changePercent1D: number;
  netChange: number;
  dayHigh: number;
  dayLow: number;
}

export const MARKET = marketData as unknown as MarketStock[];



export function getMarket(ticker: string): MarketStock | undefined {
  return MARKET.find((m) => m.ticker === ticker);
}

/* ------------------------------------------------------------------ */
/*  Canonical instrument layer                                        */
/* ------------------------------------------------------------------ */

export interface CanonicalInstrument {
  ticker: string;
  name: string;
  price: number;
  beta: number;
  sector: Sector;
  source: 'portfolio' | 'watchlist' | 'market';
}

const MARKET_MAP = new Map<string, MarketStock>();
for (const m of MARKET) MARKET_MAP.set(m.ticker, m);

/** Canonical lookup — ticker → MarketStock or undefined */
export function getInstrument(ticker: string): MarketStock | undefined {
  return MARKET_MAP.get(ticker);
}

/** Portfolio holdings as canonical instruments (ticker-based merge with market) */
export function portfolioInstruments(holdings: Holding[]): CanonicalInstrument[] {
  return holdings.map((h) => {
    const m = MARKET_MAP.get(h.ticker);
    return {
      ticker: h.ticker,
      name: m?.company ?? h.name,
      price: m?.price ?? h.price,
      beta: h.beta,
      sector: h.sector,
      source: 'portfolio' as const
    };
  });
}

/** Watchlist items as canonical instruments */
export function watchlistInstruments(watchlist: WatchlistItem[]): CanonicalInstrument[] {
  return watchlist.map((w) => {
    const m = MARKET_MAP.get(w.ticker);
    return {
      ticker: w.ticker,
      name: m?.company ?? w.ticker,
      price: m?.price ?? 0,
      beta: m ? betaFor(m.ticker) : 1.3,
      sector: m ? sectorFor(m.category) : ('Diğer' as Sector),
      source: 'watchlist' as const
    };
  });
}

/** All instruments: portfolio + watchlist + market (deduped, priority: portfolio > watchlist > market) */
export function allInstruments(holdings: Holding[], watchlist: WatchlistItem[]): CanonicalInstrument[] {
  const result: CanonicalInstrument[] = [];
  const seen = new Set<string>();

  for (const inst of portfolioInstruments(holdings)) {
    if (!seen.has(inst.ticker)) {
      seen.add(inst.ticker);
      result.push(inst);
    }
  }
  for (const inst of watchlistInstruments(watchlist)) {
    if (!seen.has(inst.ticker)) {
      seen.add(inst.ticker);
      result.push(inst);
    }
  }
  for (const m of MARKET) {
    if (!seen.has(m.ticker)) {
      seen.add(m.ticker);
      result.push({
        ticker: m.ticker,
        name: m.company,
        price: m.price,
        beta: betaFor(m.ticker),
        sector: sectorFor(m.category),
        source: 'market' as const
      });
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Grouped select options                                             */
/* ------------------------------------------------------------------ */

export interface TickerOption {
  ticker: string;
  name: string;
  price: number;
  group: 'portfolio' | 'watchlist' | 'market';
  /** Portfolio-specific metadata (only when group=portfolio) */
  shares?: number;
  weight?: number;
}

/**
 * Canonical grouped ticker options for <select> usage.
 * Priority: portfolio > watchlist > market (no duplicates).
 */
export function groupedTickerOptions(
  holdings: Holding[],
  watchlist: WatchlistItem[]
): TickerOption[] {
  const options: TickerOption[] = [];
  const seen = new Set<string>();
  const totalValue = holdings.reduce((s, h) => s + h.shares * h.price, 0);

  for (const h of holdings) {
    if (seen.has(h.ticker)) continue;
    seen.add(h.ticker);
    const m = MARKET_MAP.get(h.ticker);
    options.push({
      ticker: h.ticker,
      name: m?.company ?? h.name,
      price: m?.price ?? h.price,
      group: 'portfolio',
      shares: h.shares,
      weight: totalValue > 0 ? (h.shares * h.price) / totalValue : 0
    });
  }

  for (const w of watchlist) {
    if (seen.has(w.ticker)) continue;
    seen.add(w.ticker);
    const m = MARKET_MAP.get(w.ticker);
    options.push({
      ticker: w.ticker,
      name: m?.company ?? w.ticker,
      price: m?.price ?? 0,
      group: 'watchlist'
    });
  }

  for (const m of MARKET) {
    if (seen.has(m.ticker)) continue;
    seen.add(m.ticker);
    options.push({
      ticker: m.ticker,
      name: m.company,
      price: m.price,
      group: 'market'
    });
  }

  return options;
}

export interface TickerOptionGroup {
  key: 'portfolio' | 'watchlist' | 'market';
  label: string;
  options: TickerOption[];
}

/** Grouped ticker options ready for <optgroup> rendering (empty groups omitted). */
export function groupedTickerGroups(
  holdings: Holding[],
  watchlist: WatchlistItem[]
): TickerOptionGroup[] {
  const flat = groupedTickerOptions(holdings, watchlist);
  const groups: TickerOptionGroup[] = [
    { key: 'portfolio', label: t('portGroupPortfolio'), options: flat.filter((o) => o.group === 'portfolio') },
    { key: 'watchlist', label: 'Watchlist', options: flat.filter((o) => o.group === 'watchlist') },
    { key: 'market', label: t('portGroupMarket'), options: flat.filter((o) => o.group === 'market') }
  ];
  return groups.filter((g) => g.options.length > 0);
}

/** Flat list of tickers (for finder, etc.) */
export function allTickers(holdings: Holding[], watchlist: WatchlistItem[]): string[] {
  return allInstruments(holdings, watchlist).map((i) => i.ticker);
}

/* ------------------------------------------------------------------ */
/*  Legacy compat (finder, marketUniverse)                             */
/* ------------------------------------------------------------------ */

export interface UniverseStock extends Holding {}

export function marketUniverse(): UniverseStock[] {
  return MARKET.map((m) => ({
    ticker: m.ticker,
    name: m.company,
    shares: 1,
    price: m.price,
    cost: m.price,
    beta: betaFor(m.ticker),
    collateral: 0.75,
    sector: sectorFor(m.category)
  }));
}
