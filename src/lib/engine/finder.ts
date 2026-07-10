import type {
  AccountParams,
  FinderCandidate,
  FinderConfig,
  FinderMode,
  ScenarioInput,
  Sector,
  Holding
} from '$lib/engine/types';
import type { CostModel } from '$lib/engine/settings/types';
import { betaFor, sectorFor, getMarket } from './market';
import { computeCosts } from './costs';
import { erosionTimeline } from './scenario';
import { t as _t } from '$lib/i18n';
const t = _t as unknown as (key: string, params?: Record<string, unknown>) => string;

interface FinderContext {
  /** Merkezi collateral servisinden gelen kullanılabilir fon (profile'a göre) */
  availableFunds: number;
  account: AccountParams;
  budget: number;
  sectorWeights: Record<string, number>;
  universe: Holding[];
  costModel: CostModel;
}

interface PerScenarioEval {
  bufferPct: number;
  netPL: number;
  mcDay: number;
}

function evaluate(
  price: number,
  shares: number,
  equity: number,
  scenario: ScenarioInput,
  ctx: FinderContext
): PerScenarioEval {
  const postPrice = price * (1 + scenario.tradeShock);
  const postValue = postPrice * shares;
  const borrow = Math.max(postValue - equity, 0);
  const callPrice =
    shares > 0 ? borrow / (shares * (1 - ctx.account.maintenanceMargin)) : 0;
  const bufferPct = postPrice > 0 ? ((postPrice - callPrice) / postPrice) * 100 : 0;

  const costs = computeCosts({
    shares,
    price,
    borrow,
    holdingDays: scenario.days,
    rate: ctx.account.rate,
    costModel: ctx.costModel
  });
  const netPL = (postPrice - price) * shares - costs.total;

  const { mcDay } = erosionTimeline({
    price: postPrice,
    shares,
    borrow,
    dailyDrop: scenario.dailyDrop,
    days: scenario.days,
    maintenanceMargin: ctx.account.maintenanceMargin,
    rate: ctx.account.rate
  });

  return { bufferPct, netPL, mcDay };
}

function modeWeights(mode: FinderMode) {
  switch (mode) {
    case 'safety':
      return { s: 1.8, p: 0.35, c: 1.0, m: 1.0 };
    case 'upside':
      return { s: 0.7, p: 1.6, c: 0.8, m: 0.5 };
    default:
      return { s: 1.15, p: 1.0, c: 1.0, m: 0.8 };
  }
}

function score(
  weights: ReturnType<typeof modeWeights>,
  safety: number,
  netPL: number,
  costs: number,
  mcDayPenalty: number,
  sectorPenalty: number
): number {
  return (
    safety * weights.s +
    netPL * weights.p -
    costs * weights.c -
    mcDayPenalty * weights.m -
    sectorPenalty
  );
}

function mcDayPenalty(mcDay: number): number {
  if (mcDay < 0) return 0;
  return Math.max(0, 8 - mcDay) * 2;
}

export function runFinder(
  config: FinderConfig,
  scenarios: ScenarioInput[],
  activeScenarioName: string,
  ctx: FinderContext
): { global: FinderCandidate[]; perStock: Record<string, FinderCandidate[]> } {
  const scopeScenarios =
    config.scope === 'selected'
      ? scenarios.filter((s) => s.name === activeScenarioName)
      : scenarios;
  const evalScenarios = scopeScenarios.length ? scopeScenarios : scenarios;
  const resilienceTotal = evalScenarios.length;

  const candidates: FinderCandidate[] = [];

  for (const stock of ctx.universe) {
    for (let lot = 1; lot <= config.maxLot; lot++) {
      const tradeValue = stock.price * lot;
      const requiredEquity = tradeValue * ctx.account.initialMargin;
      const canOpen = ctx.availableFunds >= requiredEquity;
      const equity = Math.min(config.budget, tradeValue * ctx.account.initialMargin);
      if (!canOpen || equity <= 0) continue;

      const perScenario = evalScenarios.map((s) =>
        evaluate(stock.price, lot, equity, s, ctx)
      );

      const buffers = perScenario.map((e) => e.bufferPct);
      const pls = perScenario.map((e) => e.netPL);
      const mcDays = perScenario.map((e) => e.mcDay);

      const agg = (arr: number[], kind: 'avg' | 'min') =>
        kind === 'min' ? Math.min(...arr) : arr.reduce((a, b) => a + b, 0) / arr.length;

      const safety =
        config.scope === 'worst'
          ? agg(buffers, 'min')
          : config.scope === 'average'
            ? agg(buffers, 'avg')
            : buffers[0];
      const netPL =
        config.scope === 'worst'
          ? agg(pls, 'min')
          : config.scope === 'average'
            ? agg(pls, 'avg')
            : pls[0];

      const minBuffer = Math.min(...buffers);
      const minMcDay = mcDays.every((d) => d < 0)
        ? -1
        : Math.min(...mcDays.map((d) => (d < 0 ? 999 : d)));

      const sectorWeight = ctx.sectorWeights[stock.sector] ?? 0;
      const sectorPenalty = sectorWeight * 70;

      const borrow = Math.max(tradeValue - equity, 0);
      const costs = computeCosts({
        shares: lot,
        price: stock.price,
        borrow,
        holdingDays: 12,
        rate: ctx.account.rate,
        costModel: ctx.costModel
      });

      const w = modeWeights(config.mode);
      const s = score(w, safety, netPL, costs.total, mcDayPenalty(minMcDay), sectorPenalty);

      // Best-in-scenario: her senaryoda balanced skoru hesapla, en yükseğini bul
      let bestIn = evalScenarios[0]?.name ?? '';
      let bestScore = -Infinity;
      evalScenarios.forEach((sc, i) => {
        const bs = score(
          modeWeights('balanced'),
          buffers[i],
          pls[i],
          costs.total,
          mcDayPenalty(mcDays[i] < 0 ? -1 : mcDays[i]),
          sectorPenalty
        );
        if (bs > bestScore) {
          bestScore = bs;
          bestIn = sc.name;
        }
      });

      const status =
        minBuffer <= 0 ? 'danger' : minBuffer < 10 ? 'warning' : 'safe';

      const resilience = buffers.filter((b) => b > 0).length;

      const diversifyNote =
        sectorWeight > 0.3
          ? t('finderRationaleConc', { sector: stock.sector, pct: (sectorWeight * 100).toFixed(0) })
          : sectorWeight === 0
            ? t('finderRationaleNewSector', { sector: stock.sector })
            : t('finderRationaleLowWeight', { sector: stock.sector });

      const runway =
        minMcDay < 0 ? t('simRunwayLong') : t('simMcDay', { day: minMcDay });

      const rationale = `Skor ${s.toFixed(
        1
      )} — buffer %${safety.toFixed(1)}, ${diversifyNote}, beta ${stock.beta.toFixed(
        1
      )}, ${t('finderRationaleRunway', { runway })}.`;

      candidates.push({
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector as Sector,
        shares: lot,
        price: stock.price,
        beta: stock.beta,
        tradeValue,
        borrow,
        bufferPct: safety,
        netPL,
        cashPL: 0,
        mcDay: minMcDay,
        score: s,
        bestInScenario: bestIn,
        status,
        rationale,
        resilience,
        resilienceTotal
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const global = candidates.slice(0, 3);

  const perStock: Record<string, FinderCandidate[]> = {};
  for (const c of candidates) {
    (perStock[c.ticker] ??= []).push(c);
  }
  for (const k of Object.keys(perStock)) {
    perStock[k] = perStock[k].slice(0, 3);
  }

  return { global, perStock };
}
