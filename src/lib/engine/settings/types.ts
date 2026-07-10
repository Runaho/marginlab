import type { BrokerProfileId } from '../marginProfile';

export type Source =
  | 'market-data'
  | 'portfolio'
  | 'setting'
  | 'derived'
  | 'user-input'
  | 'fallback';

export type CollateralMode = 'cash-only' | 'securities-enabled';
export type FundingPolicy = 'cash-first-then-debit' | 'debit-first' | 'configurable';
export type AccrualConvention = 'daily-simple' | 'configurable';
export type CommissionModel = 'fixed' | 'per-share' | 'percentage' | 'none';
export type StalePolicy = 'warn' | 'block' | 'allow';

export interface AccountProfile {
  id: BrokerProfileId;
  name: string;
  description: string;
  collateralMode: CollateralMode;
  defaultEligibleEquityRate: number;
  defaultIneligibleRate: number;
  unknownEligibilitySafetyRate: number;
  cashCollateralRate: number;
  /** Nominal orana uygulanan çarpan (temkinli profillerde <1). */
  securitiesRateFactor: number;
  fundingPolicy: FundingPolicy;
  initialMarginRate: number;
  maintenanceMarginRate: number;
  earlyWarningBufferRate: number;
  liquidationThresholdPolicy: string;
  minimumEquityThreshold?: number;
  currency: string;
}

export interface CostModel {
  annualMarginRate: number;
  accrual: AccrualConvention;
  commissionModel: CommissionModel;
  commissionRate: number;
  commissionMin: number;
  commissionPerShare: number;
  spreadRate: number;
  secFeeRate: number;
  custodyRate: number;
  currencyConversionCost: number;
}

export interface CollateralRisk {
  eligibilityRules: string;
  instrumentTypeRates: Record<string, number>;
  concentrationThreshold: number;
  concentrationCurve: { minWeight: number; factor: number }[];
  volatilityHaircutOverride: number;
  liquidityHaircutOverride: number;
  portfolioMaxConcentration: number;
  rateSourceLabel: Source;
}

export interface ScenarioDef {
  name: string;
  description: string;
  tradePricePath: number;
  existingPortfolioPath: number;
  dailyDrop: number;
  volatilityShock: number;
  holdingPeriod: number;
  collateralHaircutShock: number;
  interestStress: number;
}

export interface ScenarioRiskThresholds {
  earlyWarningBufferRate: number;
  maintenanceMarginRate: number;
  marginCallBufferRate: number;
}

export interface ScenarioEngineSettings {
  definitions: ScenarioDef[];
  scenarioSet: string[];
  riskThresholds: ScenarioRiskThresholds;
}

export interface DataSourceSettings {
  marketDataSource: string;
  portfolioSourceMetadata: string;
  lastUpdated: string;
  fallbackBehavior: string;
  stalePolicy: StalePolicy;
}

export interface SettingsV1 {
  version: 1;
  accountProfiles: Record<BrokerProfileId, AccountProfile>;
  activeProfileId: BrokerProfileId;
  globalDefaults: {
    initialMarginRate: number;
    maintenanceMarginRate: number;
    annualMarginRate: number;
    earlyWarningBufferRate: number;
    currency: string;
  };
  costModel: CostModel;
  collateralRisk: CollateralRisk;
  scenarioEngine: ScenarioEngineSettings;
  dataSource: DataSourceSettings;
}

export type Settings = SettingsV1;

/** Değer + kaynak metadata (spec §7). */
export interface DataPoint<T> {
  value: T;
  unit?: string;
  source: Source;
  updatedAt?: string;
  assumptionsApplied?: string[];
  stale?: boolean;
}
