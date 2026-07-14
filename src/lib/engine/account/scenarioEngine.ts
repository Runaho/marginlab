import type { AccountParams, AnchorPoint, Holding, ScenarioSpec, Sector } from '../types';
import type { AccountProfile, CollateralRisk, CostModel, ScenarioRiskThresholds } from '../settings/types';
import { calculateCollateral, type CollateralState } from './collateralEngine';
import { estimateDebitLedger, type DebitLedgerResult } from './debitLedger';
import { totalInterest } from './interestEngine';
import {
  classifyRisk,
  recommendedAction,
  type RiskStatus,
  type ScenarioCalculationStatus
} from './riskThresholdEngine';

export interface TradeSpec {
  ticker: string;
  name: string;
  shares: number;
  price: number;
  cost: number;
  beta: number;
  sector: Sector;
  collateral: number;
}

export interface CombinedInput {
  cash: number;
  holdings: Holding[];
  trade: TradeSpec;
  additionalCash: number;
  account: AccountParams;
  profile: AccountProfile;
  risk: CollateralRisk;
  costModel: CostModel;
  earlyWarningThresholds: ScenarioRiskThresholds;
}

export interface CombinedResult {
  tradePriceMult: number;
  portfolioPriceMult: number;
  tradeValue: number;
  portfolioValue: number;
  combinedSecuritiesValue: number;
  cashAfter: number;
  collateral: CollateralState;
  debitBalance: number;
  accruedInterest: number;
  equity: number;
  maintenanceReq: number;
  initialReq: number;
  /** Sürdürme sınırına uzaklık (%, pozitif = güvende). */
  bufferPct: number;
  riskStatus: RiskStatus;
  recommendedAction: string;
}

export interface ScenarioDayPoint extends CombinedResult {
  day: number;
}

export interface ScenarioProjection {
  days: ScenarioDayPoint[];
  ledger: DebitLedgerResult;
  /** Sürdürme sınırını ilk kırdığı gün (-1 = hiç kırmaz). */
  marginCallDay: number;
  /** Early-warning (buffer) sınırını ilk kırdığı gün (-1 = hiç kırmaz). */
  earlyWarningDay: number;
  /**
   * Hesaplama durumunun makine-okunabilir kodu. UI metni bu alana göre üretilir,
   * `undefined`/`NaN`/`—`/`∞` gibi teknik sızıntılar bu alanı kullanmaz.
   *  - 'calculated' : hesap tamamlandı; marginCallDay ya da erken uyarı anlamlı.
   *  - 'no-margin-call-within-horizon' : hesap tamamlandı, holding period boyunca call oluşmadı.
   *  - 'insufficient-data' : gerekli girdiler eksik (fiyat, eligibility, collateral rate).
   *  - 'calculation-error' : çalışma zamanı hatası; üst bileşen fallback gösterir.
   */
  calculationStatus: ScenarioCalculationStatus;
  /**
   * Hesaplanabilir olduğunda tüm günlerdeki en düşük margin buffer (%);
   * aksi halde null. 'neden' açıklaması için kullanılır.
   */
  minBufferPct: number | null;
}

export function computeCombined(
  input: CombinedInput,
  tradePriceMult: number,
  portfolioPriceMult: number,
  ledger: DebitLedgerResult,
  accruedInterest: number
): CombinedResult {
  const tradePrice = input.trade.price * tradePriceMult;
  const tradeValue = input.trade.shares * tradePrice;
  const portfolioValue = input.holdings.reduce((s, h) => s + h.shares * h.price * portfolioPriceMult, 0);

  const scaledExisting = input.holdings.map((h) => ({ ...h, price: h.price * portfolioPriceMult }));
  const tradeHolding: Holding = {
    ticker: input.trade.ticker,
    name: input.trade.name,
    shares: input.trade.shares,
    price: tradePrice,
    cost: input.trade.cost,
    beta: input.trade.beta,
    collateral: input.trade.collateral,
    collateralSource: 'user-override',
    excludeFromCollateral: false,
    sector: input.trade.sector
  };
  const combined = [...scaledExisting, tradeHolding];
  const collateral = calculateCollateral(ledger.cashAfter, combined, input.profile, input.risk, input.account);

  const combinedSecuritiesValue = combined.reduce((s, h) => s + h.shares * h.price, 0);
  const nlv = ledger.cashAfter + combinedSecuritiesValue;
  const debitBalance = ledger.estimatedDebitBalance;
  const equity = nlv - debitBalance - accruedInterest;
  const maintenanceReq = collateral.maintenanceReq;
  const initialReq = collateral.existingInitialReq;
  const bufferPct =
    maintenanceReq > 0 ? ((equity - maintenanceReq) / maintenanceReq) * 100 : equity > 0 ? 1000 : 0;
  const riskStatus = maintenanceReq <= 0 && equity > 0 ? 'controlled' : classifyRisk(bufferPct, input.earlyWarningThresholds);

  return {
    tradePriceMult,
    portfolioPriceMult,
    tradeValue,
    portfolioValue,
    combinedSecuritiesValue,
    cashAfter: ledger.cashAfter,
    collateral,
    debitBalance,
    accruedInterest,
    equity,
    maintenanceReq,
    initialReq,
    bufferPct,
    riskStatus,
    recommendedAction: recommendedAction(riskStatus)
  };
}

/**
 * Path'i (sorted anchor listesi) günlere dağıtır.
 * - `day 0` her zaman `0` (locked).
 * - Anchor'lar day artan sırada olmalı; duplicate varsa sonuncusu kazanır (defensive).
 * - `step` interpolasyonu: bir sonraki anchor'a kadar sabit.
 * - `linear` interpolasyonu: iki anchor arasında lineer geçiş.
 * - Son anchor'dan sonraki günler son anchor'un değerini korur (extend).
 */
export function flattenPathToDailyShocks(
  path: AnchorPoint[],
  days: number,
  method: 'linear' | 'step'
): number[] {
  const out: number[] = new Array(Math.max(0, days) + 1).fill(0);
  out[0] = 0;
  if (days <= 0) return out;

  // Sorted unique anchors; day 0 force 0; anchor.day > days clamp edilir (defensive).
  const sorted = [...path]
    .filter((p) => p && isFinite(p.day) && isFinite(p.changePct))
    .sort((a, b) => a.day - b.day);
  // Day 0 anchor'unu yok say (locked 0).
  const anchors = sorted.filter((p) => p.day > 0 && p.day <= days).map((p) => ({ day: p.day, changePct: p.changePct }));

  if (anchors.length === 0) {
    // Tüm günler 0 (Flat). out zaten 0 dolu.
    return out;
  }

  if (method === 'step') {
    let cur = 0;
    for (let d = 1; d <= days; d++) {
      while (cur < anchors.length && anchors[cur].day <= d) cur++;
      // cur = ilk anchor index'i d'den büyük olan; [cur-1].changePct uygulanır.
      out[d] = anchors[Math.max(0, cur - 1)].changePct;
    }
    return out;
  }

  // linear
  let idx = 0;
  for (let d = 1; d <= days; d++) {
    // d'yi kapsayan anchor aralığını bul.
    while (idx < anchors.length - 1 && anchors[idx + 1].day < d) idx++;
    const a = anchors[idx];
    const b = anchors[Math.min(idx + 1, anchors.length - 1)];
    if (a.day === d) {
      out[d] = a.changePct;
    } else if (b.day === a.day) {
      out[d] = a.changePct;
    } else {
      const span = b.day - a.day;
      const ratio = span > 0 ? (d - a.day) / span : 0;
      out[d] = a.changePct + (b.changePct - a.changePct) * ratio;
    }
  }
  return out;
}

export interface ProjectScenarioInput extends CombinedInput {
  spec: ScenarioSpec;
  holdingDays: number;
}

export function projectScenario(input: ProjectScenarioInput): ScenarioProjection {
  const ledger = estimateDebitLedger({
    cashBefore: input.cash,
    additionalCash: input.additionalCash,
    tradeMarketValue: input.trade.shares * input.trade.price,
    openingCosts: 0,
    existingDebit: 0,
    policy: input.profile.fundingPolicy
  });

  // Spec'ten gün sayısı ve günlük çarpanlar.
  const days = Math.max(
    1,
    input.spec.kind === 'flat'
      ? input.spec.days
      : input.spec.holdingPeriod || input.holdingDays || 30
  );

  let tradeDaily: number[]; // [0..days]; indeks d = gün d'nin trade priceMult'ı (1 + changePct).
  let portDaily: number[];
  if (input.spec.kind === 'flat') {
    const useDaily = input.spec.dailyDrop !== 0;
    tradeDaily = new Array(days + 1).fill(1);
    portDaily = new Array(days + 1).fill(1);
    if (useDaily) {
      // Compound: her gün (1 + dailyDrop)^d. Phase 2 kararı: trade ve portföy aynı oranla bileşik.
      // Spec burada flat olduğu için trade ve portföy tradeShock/portfolioShock gün 0'da uygulanmaz;
      // sadece bileşik compound uygulanır.
      for (let d = 1; d <= days; d++) {
        tradeDaily[d] = Math.pow(1 + input.spec.dailyDrop, d);
        portDaily[d] = Math.pow(1 + input.spec.dailyDrop, d);
      }
    } else {
      // Ani şok: gün 0 baz, gün ≥1 tradeShock ve portfolioShock uygulanır.
      for (let d = 1; d <= days; d++) {
        tradeDaily[d] = 1 + input.spec.tradeShock;
        portDaily[d] = 1 + input.spec.portfolioShock;
      }
    }
  } else {
    // path: her seriyi kendi path'inden günlere yay.
    tradeDaily = flattenPathToDailyShocks(
      input.spec.tradePath,
      days,
      input.spec.interpolation
    ).map((pct) => 1 + pct);
    portDaily = flattenPathToDailyShocks(
      input.spec.portfolioPath,
      days,
      input.spec.interpolation
    ).map((pct) => 1 + pct);
  }

  const points: ScenarioDayPoint[] = [];
  let marginCallDay = -1;
  let earlyWarningDay = -1;
  let minBufferPct: number | null = null;

  // Veri eksikliği erken tespit.
  if (!isFinite(input.trade.price) || input.trade.price <= 0 || !isFinite(input.trade.shares) || input.trade.shares <= 0) {
    return {
      days: [],
      ledger,
      marginCallDay: -1,
      earlyWarningDay: -1,
      calculationStatus: 'insufficient-data',
      minBufferPct: null
    };
  }

  for (let d = 0; d <= days; d++) {
    const tradeMult = tradeDaily[d] ?? 1;
    const portMult = portDaily[d] ?? 1;
    const accrued = totalInterest(ledger.estimatedDebitBalance, input.account.rate, d);
    const r = computeCombined(input, tradeMult, portMult, ledger, accrued) as ScenarioDayPoint;
    r.day = d;
    points.push(r);
    if (isFinite(r.bufferPct)) {
      minBufferPct = minBufferPct === null ? r.bufferPct : Math.min(minBufferPct, r.bufferPct);
    }
    if ((r.riskStatus === 'margin-call' || r.bufferPct <= 0) && marginCallDay < 0 && d > 0) {
      marginCallDay = d;
    }
    if (r.riskStatus === 'early-warning' && earlyWarningDay < 0 && d > 0) {
      earlyWarningDay = d;
    }
  }

  const calculationStatus: ScenarioCalculationStatus =
    marginCallDay > 0
      ? 'calculated'
      : minBufferPct === null
        ? 'insufficient-data'
        : 'no-margin-call-within-horizon';

  return { days: points, ledger, marginCallDay, earlyWarningDay, calculationStatus, minBufferPct };
}

export interface ShockMatrixCell {
  tradeShock: number;
  portfolioShock: number;
  riskStatus: RiskStatus;
  bufferPct: number;
  tradeValue: number;
  portfolioValue: number;
  recommendedAction: string;
  calculationStatus: ScenarioCalculationStatus;
}

export interface ShockMatrix {
  tradeShocks: number[];
  portfolioShocks: number[];
  cells: ShockMatrixCell[][];
}

export function shockMatrix(
  input: CombinedInput,
  tradeShocks: number[] = defaultGrid(),
  portfolioShocks: number[] = defaultGrid()
): ShockMatrix {
  const ledger = estimateDebitLedger({
    cashBefore: input.cash,
    additionalCash: input.additionalCash,
    tradeMarketValue: input.trade.shares * input.trade.price,
    openingCosts: 0,
    existingDebit: 0,
    policy: input.profile.fundingPolicy
  });

  const cells: ShockMatrixCell[][] = portfolioShocks.map((ps) =>
    tradeShocks.map((ts) => {
      const r = computeCombined(input, 1 + ts, 1 + ps, ledger, 0);
      const ok = isFinite(r.bufferPct);
      return {
        tradeShock: ts,
        portfolioShock: ps,
        riskStatus: r.riskStatus,
        bufferPct: r.bufferPct,
        tradeValue: r.tradeValue,
        portfolioValue: r.portfolioValue,
        recommendedAction: r.recommendedAction,
        calculationStatus: ok
          ? r.bufferPct <= 0
            ? 'calculated'
            : 'no-margin-call-within-horizon'
          : 'insufficient-data'
      };
    })
  );

  return { tradeShocks, portfolioShocks, cells };
}

function defaultGrid(): number[] {
  const g: number[] = [];
  for (let v = -0.5; v <= 0.5001; v += 0.1) g.push(Math.round(v * 100) / 100);
  return g;
}
