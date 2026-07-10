import type { SettingsV1, AccountProfile } from './types';
import type { BrokerProfileId } from '../marginProfile';
import {
  BROKER_PROFILES,
  SCENARIOS,
  DEFAULT_COLLATERAL_RATE,
  CONCENTRATION,
  DEFAULT_ACCOUNT
} from '../config';
import type { BrokerProfile } from '../marginProfile';

function profileToAccount(p: BrokerProfile): AccountProfile {
  const eligible = p.securitiesAsCollateral ? DEFAULT_COLLATERAL_RATE * (p.securitiesRateFactor ?? 1) : 0;
  return {
    id: p.id,
    name: p.label,
    description: p.description,
    collateralMode: p.securitiesAsCollateral ? 'securities-enabled' : 'cash-only',
    defaultEligibleEquityRate: eligible,
    defaultIneligibleRate: 0,
    unknownEligibilitySafetyRate: 0,
    cashCollateralRate: 1,
    securitiesRateFactor: p.securitiesRateFactor ?? 1,
    fundingPolicy: 'cash-first-then-debit',
    initialMarginRate: DEFAULT_ACCOUNT.initialMargin,
    maintenanceMarginRate: DEFAULT_ACCOUNT.maintenanceMargin,
    earlyWarningBufferRate: 0.1,
    liquidationThresholdPolicy:
      'Sürdürme sınırının altına inilince broker, pozisyonları kısmi veya tam tasfiye etme hakkına sahiptir.',
    minimumEquityThreshold: undefined,
    currency: 'USD'
  };
}

export function seedSettings(): SettingsV1 {
  const accountProfiles = {} as Record<BrokerProfileId, AccountProfile>;
  (Object.keys(BROKER_PROFILES) as BrokerProfileId[]).forEach((id) => {
    accountProfiles[id] = profileToAccount(BROKER_PROFILES[id]);
  });

  return {
    version: 1,
    accountProfiles,
    activeProfileId: 'general',
    globalDefaults: {
      initialMarginRate: DEFAULT_ACCOUNT.initialMargin,
      maintenanceMarginRate: DEFAULT_ACCOUNT.maintenanceMargin,
      annualMarginRate: DEFAULT_ACCOUNT.rate,
      earlyWarningBufferRate: 0.1,
      currency: 'USD'
    },
    costModel: {
      annualMarginRate: DEFAULT_ACCOUNT.rate,
      accrual: 'daily-simple',
      commissionModel: 'percentage',
      commissionRate: 0.0025,
      commissionMin: 1,
      commissionPerShare: 0,
      spreadRate: 0.01,
      secFeeRate: 0.0000206,
      custodyRate: 0.0005,
      currencyConversionCost: 0
    },
    collateralRisk: {
      eligibilityRules: 'Piyasa verisiyle eşleşen ve hariç tutulmayan pozisyonlar uygundur.',
      instrumentTypeRates: {},
      concentrationThreshold: CONCENTRATION.thresholds[0]?.minWeight ?? 0.4,
      concentrationCurve: CONCENTRATION.thresholds,
      volatilityHaircutOverride: 0,
      liquidityHaircutOverride: 0,
      portfolioMaxConcentration: CONCENTRATION.thresholds[0]?.minWeight ?? 0.4,
      rateSourceLabel: 'setting'
    },
    scenarioEngine: {
      definitions: SCENARIOS.map((s) => ({
        name: s.name,
        description: s.description,
        tradePricePath: s.tradeShock,
        existingPortfolioPath: s.portfolioShock,
        dailyDrop: s.dailyDrop,
        volatilityShock: 0,
        holdingPeriod: s.days,
        collateralHaircutShock: 0,
        interestStress: 0
      })),
      scenarioSet: SCENARIOS.map((s) => s.name),
      riskThresholds: {
        earlyWarningBufferRate: 0.1,
        maintenanceMarginRate: DEFAULT_ACCOUNT.maintenanceMargin,
        marginCallBufferRate: 0
      }
    },
    dataSource: {
      marketDataSource: 'marketData.json',
      portfolioSourceMetadata: 'defaultPortfolio.json',
      lastUpdated: new Date().toISOString(),
      fallbackBehavior: 'Piyasa verisi yoksa kullanıcı fiyatı elle girer; oranlar varsayımsal kabul edilir.',
      stalePolicy: 'warn'
    }
  };
}
