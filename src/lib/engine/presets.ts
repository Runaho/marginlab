import type { Holding } from './types';
import defaultPortfolio from '../data/defaultPortfolio.json';
import { SCENARIOS, SECTORS } from './config';

export const DEFAULT_PORTFOLIO = defaultPortfolio as unknown as {
  cash: number;
  account: { initialMargin: number; maintenanceMargin: number; rate: number };
  holdings: Holding[];
};

/** Senaryo kütüphanesi — 9 hazır stres testi (kaynak: src/lib/data/defaults.json). */
export { SCENARIOS };

/** Sektör listesi (kaynak: src/lib/data/defaults.json). */
export { SECTORS };
