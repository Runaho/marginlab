import type { Holding, AccountParams } from '../types';
import type { CollateralSource } from '../marginProfile';
import type { AccountProfile, CollateralRisk } from '../settings/types';

export function concentrationFactor(weight: number, risk: CollateralRisk): number {
  for (const t of risk.concentrationCurve) {
    if (weight > t.minWeight) return t.factor;
  }
  return 1;
}

export interface PerHoldingCollateral {
  ticker: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  weight: number;
  nominalRate: number;
  effectiveRate: number;
  effectiveValue: number;
  source: CollateralSource;
  eligible: boolean;
  excluded: boolean;
}

export interface CollateralState {
  cashCollateral: number;
  securitiesCollateral: number;
  totalCollateral: number;
  /** Mevcut başlangıç teminatı yükümlülüğü (kredi modeli). */
  existingInitialReq: number;
  /** Kullanılabilir fon = toplam collateral - mevcut başlangıç teminatı. */
  availableFunds: number;
  /** Toplam sürdürme teminatı yükümlülüğü. */
  maintenanceReq: number;
  /** Fazla likidite = özkaynak - sürdürme yükümlülüğü. */
  excessLiquidity: number;
  /** Collateral havuzunun piyasa fiyatına bağlı payı (0-1). */
  pctMarketDependent: number;
  perHolding: PerHoldingCollateral[];
}

export function calculateCollateral(
  cash: number,
  holdings: Holding[],
  profile: AccountProfile,
  risk: CollateralRisk,
  account: AccountParams
): CollateralState {
  const cashCollateral = cash * profile.cashCollateralRate;
  const securitiesValue = holdings.reduce((s, h) => s + h.shares * h.price, 0);

  let securitiesCollateral = 0;
  const perHolding: PerHoldingCollateral[] = [];
  let existingInitialReq = 0;
  let maintenanceReq = 0;

  if (profile.collateralMode === 'securities-enabled') {
    for (const h of holdings) {
      const value = h.shares * h.price;
      const weight = securitiesValue > 0 ? value / securitiesValue : 0;
      const nominalRate = h.collateral ?? profile.defaultEligibleEquityRate;
      const excluded = h.excludeFromCollateral === true;
      const source: CollateralSource = h.collateralSource ?? 'default-assumption';
      // 'unknown' kaynak güvenli %0; 'unavailable'/%0 oran hariç tutulanlar eligible değil.
      const eligible = !excluded && source !== 'unknown';
      const effectiveRate = eligible ? nominalRate * profile.securitiesRateFactor : 0;
      const effectiveValue = value * effectiveRate;
      if (eligible) securitiesCollateral += effectiveValue;
      existingInitialReq += value * account.initialMargin;
      maintenanceReq += value * account.maintenanceMargin * concentrationFactor(weight, risk);
      perHolding.push({
        ticker: h.ticker,
        name: h.name,
        shares: h.shares,
        price: h.price,
        value,
        weight,
        nominalRate,
        effectiveRate,
        effectiveValue,
        source,
        eligible,
        excluded
      });
    }
  } else {
    // cash-only: menkul kıymet teminat üretmez; sadece nakit sayılır.
    for (const h of holdings) {
      const value = h.shares * h.price;
      const weight = securitiesValue > 0 ? value / securitiesValue : 0;
      perHolding.push({
        ticker: h.ticker,
        name: h.name,
        shares: h.shares,
        price: h.price,
        value,
        weight,
        nominalRate: h.collateral ?? 0,
        effectiveRate: 0,
        effectiveValue: 0,
        source: h.collateralSource ?? 'default-assumption',
        eligible: false,
        excluded: true
      });
      existingInitialReq += value * account.initialMargin;
      maintenanceReq += value * account.maintenanceMargin * concentrationFactor(weight, risk);
    }
  }

  const totalCollateral = cashCollateral + securitiesCollateral;
  const availableFunds = totalCollateral - existingInitialReq;
  const netLiquidationValue = cash + securitiesValue;
  const excessLiquidity = netLiquidationValue - maintenanceReq;
  const pctMarketDependent = totalCollateral > 0 ? securitiesCollateral / totalCollateral : 0;

  return {
    cashCollateral,
    securitiesCollateral,
    totalCollateral,
    existingInitialReq,
    availableFunds,
    maintenanceReq,
    excessLiquidity,
    pctMarketDependent,
    perHolding
  };
}
