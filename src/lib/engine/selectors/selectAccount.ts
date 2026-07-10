import type { Holding, AccountParams, EnrichedHolding, HealthAlert, AlertLevel } from '../types';
import type { Settings } from '../settings/types';
import type { BrokerProfileId, CollateralSource } from '../marginProfile';
import {
  resolveProfile,
  resolveAccountParams,
  resolveCollateralRisk,
  resolveEarlyWarning
} from '../account/settingsResolver';
import { calculateCollateral, type CollateralState } from '../account/collateralEngine';
import { t as _t } from '$lib/i18n';

const t = _t as unknown as (key: string, params?: Record<string, unknown>) => string;

export interface AccountView {
  cash: number;
  securitiesValue: number;
  netLiquidationValue: number;
  collateral: CollateralState;
  account: AccountParams;
  profileId: BrokerProfileId;
  earlyWarningBufferPct: number;
  health: number;
  healthNarrative: string;
  alerts: HealthAlert[];
  largest: EnrichedHolding | null;
  concentration: number;
  concentrationFlag: boolean;
  sectorWeights: Record<string, number>;
  weightedBeta: number;
  total: number;
  totalInvested: number;
  cashRatio: number;
  availableCollateral: number;
  availableFunds: number;
  excessLiquidity: number;
  pctMarketDependent: number;
  perHoldingCollateral: ReturnType<typeof getPerHolding>;
  buyingPower: number;
}

export interface HoldingView {
  ticker: string;
  name: string;
  shares: number;
  price: number;
  cost: number;
  value: number;
  weight: number;
  pl: number;
  plPct: number;
  collateral: number;
  effectiveCollateralRate: number;
  displayCollateralRate: number;
  effectiveValue: number;
  resolvedSource: CollateralSource;
  excluded: boolean;
}

function getPerHolding(holdings: Holding[], profileId: BrokerProfileId, settings: Settings) {
  const profile = resolveProfile(settings, profileId);
  const risk = resolveCollateralRisk(settings);
  const account = resolveAccountParams(settings, profileId);
  const snap = calculateCollateral(0, holdings, profile, risk, account);
  return snap.perHolding.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    value: h.value,
    rate: h.effectiveRate,
    displayRate: h.nominalRate,
    effectiveValue: h.effectiveValue,
    source: h.source,
    eligibility: h.eligible ? 'eligible' : h.excluded ? 'ineligible' : 'unknown'
  }));
}

function enrichHolding(h: Holding, totalInvested: number, weight: number, settings: Settings, profileId: BrokerProfileId): EnrichedHolding {
  const value = h.shares * h.price;
  const costValue = h.shares * h.cost;
  const pl = value - costValue;
  const profile = resolveProfile(settings, profileId);
  const risk = resolveCollateralRisk(settings);
  const account = resolveAccountParams(settings, profileId);
  const snap = calculateCollateral(0, [h], profile, risk, account);
  const per = snap.perHolding[0];
  return {
    ...h,
    value,
    weight,
    pl,
    plPct: costValue > 0 ? pl / costValue : 0,
    collateralValue: per ? per.effectiveValue : 0,
    effectiveCollateralRate: per ? per.effectiveRate : 0,
    displayCollateralRate: h.collateral,
    resolvedSource: (h.collateralSource ?? 'default-assumption') as CollateralSource
  };
}

function healthScore(input: {
  cashRatio: number;
  concentration: number;
  weightedBeta: number;
  concThreshold: number;
}): { health: number; healthNarrative: string } {
  let health = 100;
  const reasons: string[] = [];
  if (input.cashRatio < 0.1) {
    health -= 18;
    reasons.push(t('alertReasonNakitDusuk'));
  }
  if (input.concentration > input.concThreshold) {
    health -= 24;
    reasons.push(t('alertReasonTekPozYuksek'));
  } else if (input.concentration > input.concThreshold * 0.75) {
    health -= 14;
    reasons.push(t('alertReasonConcVar'));
  }
  if (input.weightedBeta > 1.6) {
    health -= 22;
    reasons.push(t('alertReasonBetaYuksek'));
  } else if (input.weightedBeta > 1.3) {
    health -= 12;
    reasons.push(t('alertReasonBetaUst'));
  }
  health = Math.max(0, Math.min(100, Math.round(health)));
  const healthNarrative =
    reasons.length > 0
      ? t('alertHealthReasons', { health, reasons: reasons.join(', ') })
      : t('alertHealthBalanced', { health });
  return { health, healthNarrative };
}

function healthAlerts(input: {
  cashRatio: number;
  concentration: number;
  weightedBeta: number;
  health: number;
  concThreshold: number;
}): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  if (input.cashRatio < 0.05) {
    alerts.push({ level: 'danger', title: t('alertNakitKritik'), detail: t('alertNakitAz') });
  } else if (input.cashRatio < 0.1) {
    alerts.push({ level: 'warning', title: t('alertNakitTampon'), detail: t('alertNakitDusuk') });
  }
  if (input.concentration > input.concThreshold) {
    alerts.push({ level: 'danger', title: t('alertAsiriConc'), detail: t('alertAsiriConcBody') });
  } else if (input.concentration > input.concThreshold * 0.75) {
    alerts.push({ level: 'warning', title: t('alertConcTakip'), detail: t('alertConcTakipBody') });
  }
  if (input.weightedBeta > 1.6) {
    alerts.push({ level: 'warning', title: t('alertYuksekDuyarli'), detail: t('alertYuksekDuyarliBody') });
  }
  if (alerts.length === 0) {
    alerts.push({ level: 'safe', title: t('alertYapiSaglam'), detail: t('alertYapiSaglamBody') });
  }
  return alerts;
}

function topLevel(alerts: HealthAlert[]): AlertLevel {
  if (alerts.some((a) => a.level === 'danger')) return 'danger';
  if (alerts.some((a) => a.level === 'warning')) return 'warning';
  return 'safe';
}

export { topLevel };

/**
 * Hesap snapshot'ı: TEK KAYNAK = settings.
 * app.portfolio.cash + app.portfolio.holdings (veri) + settings (kurallar).
 * Eski `portfolioStats(app.portfolio, app.profile)` çağrılarının yerini alır.
 */
export function selectAccount(input: {
  cash: number;
  holdings: Holding[];
  profileId: BrokerProfileId;
  settings: Settings;
}): AccountView {
  const profile = resolveProfile(input.settings, input.profileId);
  const account = resolveAccountParams(input.settings, input.profileId);
  const risk = resolveCollateralRisk(input.settings);
  const ewPct = resolveEarlyWarning(input.settings, input.profileId) * 100;

  const collateral = calculateCollateral(input.cash, input.holdings, profile, risk, account);
  const securitiesValue = input.holdings.reduce((s, h) => s + h.shares * h.price, 0);
  const totalInvested = securitiesValue;
  const total = totalInvested + input.cash;
  const cashRatio = total > 0 ? input.cash / total : 0;

  const weights = input.holdings.map((h) => (securitiesValue > 0 ? (h.shares * h.price) / securitiesValue : 0));
  const enriched = input.holdings
    .map((h, i) => enrichHolding(h, totalInvested, weights[i] ?? 0, input.settings, input.profileId))
    .sort((a, b) => b.value - a.value);

  const largest = enriched.length ? enriched[0] : null;
  const concentration = largest ? largest.weight : 0;
  const concentrationFlag = concentration > risk.concentrationThreshold;

  const sectorWeights: Record<string, number> = {};
  for (const h of enriched) {
    sectorWeights[h.sector] = (sectorWeights[h.sector] ?? 0) + h.weight;
  }

  const weightedBeta = totalInvested > 0
    ? enriched.reduce((s, h) => s + h.weight * h.beta, 0)
    : 0;

  const { health, healthNarrative } = healthScore({
    cashRatio,
    concentration,
    weightedBeta,
    concThreshold: risk.concentrationThreshold
  });
  const alerts = healthAlerts({ cashRatio, concentration, weightedBeta, health, concThreshold: risk.concentrationThreshold });

  const buyingPower = account.initialMargin > 0 ? collateral.availableFunds / account.initialMargin : 0;

  return {
    cash: input.cash,
    securitiesValue,
    netLiquidationValue: total,
    collateral,
    account,
    profileId: input.profileId,
    earlyWarningBufferPct: ewPct,
    health,
    healthNarrative,
    alerts,
    largest,
    concentration,
    concentrationFlag,
    sectorWeights,
    weightedBeta,
    total,
    totalInvested,
    cashRatio,
    availableCollateral: collateral.totalCollateral,
    availableFunds: collateral.availableFunds,
    excessLiquidity: collateral.excessLiquidity,
    pctMarketDependent: collateral.pctMarketDependent,
    perHoldingCollateral: getPerHolding(input.holdings, input.profileId, input.settings),
    buyingPower
  };
}

/**
 * Tek tek pozisyon için enriched view — portfolio sayfası tablo render'ı için.
 * settings tek kaynaktır.
 */
export function enrichHoldings(input: {
  holdings: Holding[];
  profileId: BrokerProfileId;
  settings: Settings;
}): HoldingView[] {
  const totalInvested = input.holdings.reduce((s, h) => s + h.shares * h.price, 0);
  return input.holdings.map((h) => {
    const enriched = enrichHolding(h, totalInvested, totalInvested > 0 ? (h.shares * h.price) / totalInvested : 0, input.settings, input.profileId);
    return {
      ticker: enriched.ticker,
      name: enriched.name,
      shares: enriched.shares,
      price: enriched.price,
      cost: enriched.cost,
      value: enriched.value,
      weight: enriched.weight,
      pl: enriched.pl,
      plPct: enriched.plPct,
      collateral: enriched.displayCollateralRate,
      effectiveCollateralRate: enriched.effectiveCollateralRate,
      displayCollateralRate: enriched.displayCollateralRate,
      effectiveValue: enriched.collateralValue,
      resolvedSource: enriched.resolvedSource as CollateralSource,
      excluded: enriched.excludeFromCollateral ?? false
    };
  });
}
