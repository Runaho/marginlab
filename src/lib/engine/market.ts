import type { Holding, Sector } from './types';
import marketData from '../data/marketData.json';

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

// Beta verisi JSON'da yok; kategoriye/tickere göre makul varsayılanlar.
const BETA: Record<string, number> = {
  GFS: 1.6,
  AMKR: 1.4,
  ENTG: 1.5,
  QCOM: 1.3,
  NVDA: 1.75,
  KLAC: 1.4,
  MRVL: 1.6,
  ONTO: 1.5,
  ARM: 1.7,
  LRCX: 1.5,
  TER: 1.4,
  AVGO: 1.3,
  TSM: 1.2,
  WDC: 1.5,
  AMAT: 1.4,
  META: 1.3,
  MU: 1.7,
  ASML: 1.4
};

export function betaFor(ticker: string): number {
  return BETA[ticker] ?? 1.3;
}

export function sectorFor(category: string): Sector {
  if (category.toLowerCase().includes('internet')) return 'İletişim';
  return 'Teknoloji';
}

export function getMarket(ticker: string): MarketStock | undefined {
  return MARKET.find((m) => m.ticker === ticker);
}

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
