import type { ScenarioRiskThresholds } from '../settings/types';

export type RiskStatus = 'controlled' | 'early-warning' | 'maintenance-risk' | 'margin-call';

export type ScenarioCalculationStatus =
  | 'calculated'
  | 'no-margin-call-within-horizon'
  | 'insufficient-data'
  | 'calculation-error';

export interface RecommendationKey {
  /** i18n key (without the "recommendedAction" prefix mapping). */
  key: 'recommendedActionMc' | 'recommendedActionMr' | 'recommendedActionEw' | 'recommendedActionControlled';
}

/** buffer, call fiyatına uzaklığın yüzdesi (pozitif = sürdürme sınırının üstünde). */
export function classifyRisk(bufferPct: number, thresholds: ScenarioRiskThresholds): RiskStatus {
  const mc = thresholds.marginCallBufferRate * 100;
  const ew = thresholds.earlyWarningBufferRate * 100;
  if (bufferPct <= mc) return 'margin-call';
  if (bufferPct < mc + (ew - mc) / 2) return 'maintenance-risk';
  if (bufferPct < ew) return 'early-warning';
  return 'controlled';
}

export function recommendationKey(status: RiskStatus): RecommendationKey['key'] {
  switch (status) {
    case 'margin-call':
      return 'recommendedActionMc';
    case 'maintenance-risk':
      return 'recommendedActionMr';
    case 'early-warning':
      return 'recommendedActionEw';
    default:
      return 'recommendedActionControlled';
  }
}

/** @deprecated Use recommendationKey() and translate at the UI boundary. */
export function recommendedAction(status: RiskStatus): string {
  switch (status) {
    case 'margin-call':
      return 'Pozisyon margin call bölgesinde — ek nakit/collateral gerekir veya pozisyon küçültülmeli.';
    case 'maintenance-risk':
      return 'Sürdürme sınırına çok yakın — küçük bir düşüşte call tetiklenir.';
    case 'early-warning':
      return 'Buffer ince — ekstra düşüşe karşı temkinli ol.';
    default:
      return 'Yapı sürdürme sınırının üzerinde kalıyor.';
  }
}
