import type { AccountParams } from '../types';
import type { Settings, AccountProfile, CollateralRisk } from '../settings/types';
import type { BrokerProfileId } from '../marginProfile';

/**
 * Tek kaynak: aktif profil. Bulunamazsa globalDefaults fallback.
 * Ayar hiyerarşisi (deterministik):
 *   explicit user input (slider)  >  aktif profil  >  globalDefaults  >  kabul edilen fallback
 */
export function resolveProfile(s: Settings, id: BrokerProfileId): AccountProfile {
  const direct = s.accountProfiles[id];
  if (direct) return direct;
  return fallbackProfile(s, id);
}

/**
 * Profil bulunamadığında veya alanı eksik olduğunda globalDefaults'a düşer.
 * Bu, "Yeni profil oluşturma başlangıç değerleri" rolünün ötesinde,
 * "bilinmeyen/bilinçsiz profil erişiminde de fallback" rolünü üstlenir.
 */
export function fallbackProfile(s: Settings, id?: BrokerProfileId): AccountProfile {
  const g = s.globalDefaults;
  return {
    id: (id ?? 'general') as BrokerProfileId,
    name: (id ?? 'general') as string,
    description: '',
    collateralMode: 'securities-enabled',
    defaultEligibleEquityRate: 0.5,
    defaultIneligibleRate: 0,
    unknownEligibilitySafetyRate: 0,
    cashCollateralRate: 1,
    securitiesRateFactor: g.initialMarginRate,
    fundingPolicy: 'cash-first-then-debit',
    initialMarginRate: g.initialMarginRate,
    maintenanceMarginRate: g.maintenanceMarginRate,
    earlyWarningBufferRate: g.earlyWarningBufferRate,
    liquidationThresholdPolicy: 'standard',
    currency: g.currency
  };
}

/**
 * Hesap seviyesi margin parametrelerini çözümler.
 * Öncelik: aktif profil → globalDefaults → deterministik fallback.
 * costModel.annualMarginRate için de globalDefaults fallback.
 */
export function resolveAccountParams(s: Settings, id: BrokerProfileId): AccountParams {
  const p = resolveProfile(s, id);
  const g = s.globalDefaults;
  return {
    initialMargin: p.initialMarginRate ?? g.initialMarginRate,
    maintenanceMargin: p.maintenanceMarginRate ?? g.maintenanceMarginRate,
    rate: s.costModel.annualMarginRate ?? g.annualMarginRate
  };
}

export function resolveCollateralRisk(s: Settings): CollateralRisk {
  return s.collateralRisk;
}

/** Early-warning buffer oranını çözümler (profil değeri öncelikli). */
export function resolveEarlyWarning(s: Settings, id: BrokerProfileId): number {
  return resolveProfile(s, id).earlyWarningBufferRate ?? s.globalDefaults.earlyWarningBufferRate;
}
