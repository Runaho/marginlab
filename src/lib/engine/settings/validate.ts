import type { Settings } from './types';
import { seedSettings } from './defaults';

export interface ValidationIssue {
  path: string;
  message: string;
  level: 'error' | 'warning';
}

export function validateSettings(s: Settings): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const g = s.globalDefaults;

  if (g.annualMarginRate < 0) issues.push({ path: 'globalDefaults.annualMarginRate', message: 'Faiz oranı negatif olamaz.', level: 'error' });
  if (g.annualMarginRate > 1) issues.push({ path: 'globalDefaults.annualMarginRate', message: 'Faiz oranı %100′ten büyük olamaz.', level: 'error' });
  if (g.maintenanceMarginRate <= 0 || g.maintenanceMarginRate >= 1) issues.push({ path: 'globalDefaults.maintenanceMarginRate', message: 'Sürdürme oranı %0–%100 arası olmalı.', level: 'error' });
  if (g.initialMarginRate <= 0 || g.initialMarginRate > 1) issues.push({ path: 'globalDefaults.initialMarginRate', message: 'Başlangıç oranı %0–%100 arası olmalı.', level: 'error' });
  if (g.initialMarginRate < g.maintenanceMarginRate) issues.push({ path: 'globalDefaults.initialMarginRate', message: 'Başlangıç oranı sürdürme oranından küçük olamaz (gerçekçi değil).', level: 'warning' });

  const cm = s.costModel;
  if (cm.commissionRate < 0) issues.push({ path: 'costModel.commissionRate', message: 'Komisyon oranı negatif olamaz.', level: 'error' });
  if (cm.spreadRate < 0) issues.push({ path: 'costModel.spreadRate', message: 'Spread oranı negatif olamaz.', level: 'error' });
  if (cm.secFeeRate < 0) issues.push({ path: 'costModel.secFeeRate', message: 'SEC ücreti negatif olamaz.', level: 'error' });

  const cr = s.collateralRisk;
  if (cr.concentrationThreshold < 0 || cr.concentrationThreshold > 1) issues.push({ path: 'collateralRisk.concentrationThreshold', message: 'Yoğunlaşma eşiği %0–%100 arası olmalı.', level: 'error' });
  if (cr.portfolioMaxConcentration < 0 || cr.portfolioMaxConcentration > 1) issues.push({ path: 'collateralRisk.portfolioMaxConcentration', message: 'Portföy maks yoğunlaşma %0–%100 arası olmalı.', level: 'error' });
  for (const c of cr.concentrationCurve) {
    if (c.factor < 1) issues.push({ path: 'collateralRisk.concentrationCurve', message: 'Yoğunlaşma haircut çarpanı 1′den küçük olamaz (indirim değil artış olmalı).', level: 'error' });
  }

  for (const id of Object.keys(s.accountProfiles) as Array<keyof typeof s.accountProfiles>) {
    const p = s.accountProfiles[id];
    if (p.defaultEligibleEquityRate < 0 || p.defaultEligibleEquityRate > 1) issues.push({ path: `accountProfiles.${id}.defaultEligibleEquityRate`, message: 'Eligible collateral oranı %0–%100 arası olmalı.', level: 'error' });
    if (p.cashCollateralRate < 0 || p.cashCollateralRate > 1) issues.push({ path: `accountProfiles.${id}.cashCollateralRate`, message: 'Nakit collateral oranı %0–%100 arası olmalı.', level: 'error' });
    if (p.initialMarginRate < p.maintenanceMarginRate) issues.push({ path: `accountProfiles.${id}.initialMarginRate`, message: 'Başlangıç oranı sürdürmeden küçük olamaz.', level: 'warning' });
  }

  return issues;
}
