import type { AccountParams, ScenarioInput, Sector } from './types';
import type { BrokerProfile, BrokerProfileId, CollateralSource } from './marginProfile';

import defaults from '../data/defaults.json';
import { collateralSourceLabel } from '$lib/i18n/labels';

export const DEFAULT_ACCOUNT: AccountParams = defaults.defaultAccount;

export const DEFAULT_COLLATERAL_RATE: number = defaults.defaultCollateralRate;

export const DEFAULT_PROFILE_ID: BrokerProfileId = defaults.defaultProfileId as BrokerProfileId;

export const BROKER_PROFILES: Record<BrokerProfileId, BrokerProfile> =
  defaults.brokerProfiles as Record<BrokerProfileId, BrokerProfile>;

export const MARGIN_DISCLAIMER: string = defaults.marginDisclaimer;

export const SECTORS: Sector[] = defaults.sectors as Sector[];

export const SCENARIOS: ScenarioInput[] = defaults.scenarios as ScenarioInput[];

export const PDT_RULES = {
  equityThreshold: defaults.pdt.equityThreshold,
  maxLeverage: defaults.pdt.maxLeverage
};

export const CONCENTRATION = defaults.concentration as {
  thresholds: { minWeight: number; factor: number }[];
  defaultFactor: number;
};

export function getProfile(id: BrokerProfileId | string | undefined): BrokerProfile {
  if (id && id in BROKER_PROFILES) {
    return BROKER_PROFILES[id as BrokerProfileId];
  }
  return BROKER_PROFILES[DEFAULT_PROFILE_ID];
}

export const PROFILE_LIST: BrokerProfile[] = Object.values(BROKER_PROFILES);

const BETA: Record<string, number> = defaults.betaMap;
const DEFAULT_BETA: number = defaults.defaultBeta;

export function betaFor(ticker: string): number {
  return BETA[ticker] ?? DEFAULT_BETA;
}

const SECTOR_KEYWORD_MAP: { keywords: string[]; sector: string }[] = defaults.sectorRules.keywordMap;
const DEFAULT_SECTOR: string = defaults.sectorRules.defaultSector;

export function sectorFor(category: string): Sector {
  const c = category.toLowerCase();
  for (const rule of SECTOR_KEYWORD_MAP) {
    if (rule.keywords.some((k) => c.includes(k.toLowerCase()))) {
      return rule.sector as Sector;
    }
  }
  return DEFAULT_SECTOR as Sector;
}

export const COLLATERAL_SOURCE_LABELS: Record<CollateralSource, string> = {
  'broker-data': collateralSourceLabel('broker-data', DEFAULT_COLLATERAL_RATE),
  'default-assumption': collateralSourceLabel('default-assumption', DEFAULT_COLLATERAL_RATE),
  'user-override': collateralSourceLabel('user-override', DEFAULT_COLLATERAL_RATE),
  unavailable: collateralSourceLabel('unavailable', DEFAULT_COLLATERAL_RATE),
  unknown: collateralSourceLabel('unknown', DEFAULT_COLLATERAL_RATE)
};
