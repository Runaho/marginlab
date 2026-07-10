// Merkezi collateral (teminat) domain servisi.
// Portföy, simülatör, senaryo ve Trade Bulucu HEP buradan beslenmelidir.
// Nakit + menkul kıymet teminatı hesap seviyesinde bir "collateral havuzu" olarak çözülür.
// Belirli bir hisse belirli bir trade'e TAHSİS EDİLMEZ; toplam uygun kapasite simüle edilir.

import type { HoldingCollateral, Holding, PortfolioData } from './types';
import type { BrokerProfile, CollateralSource } from './marginProfile';
import { DEFAULT_COLLATERAL_RATE } from './marginProfile';

export interface ResolvedCollateral {
  /** Eligibility hesabında kullanılan efektif oran (0-1), profil çarpanı dahil */
  rate: number;
  /** UI'da gösterilecek nominal oran (0-1) */
  displayRate: number;
  /** Profil etkisi dahil çözümlenmiş kaynak */
  source: CollateralSource;
  /** Haircut sonrası efektif teminat değeri */
  effectiveValue: number;
  /** Pozisyonun piyasa değeri */
  value: number;
  /** Eligibility durumu */
  eligibility: 'eligible' | 'ineligible' | 'unknown';
}

/**
 * Tek bir pozisyonun teminat oranını profile göre çözer.
 * - Kullanıcı pozisyonu havuzdan hariç tuttuysa → 0, "Uygun değil".
 * - Profil menkul kıymeti teminata saymıyorsa → 0, "Uygun değil".
 * - Instrument 'unavailable' → 0.
 * - Instrument 'unknown' → eligibility'de güvenli %0 ama oran gizlenmez, "Doğrulanmadı".
 * - Aksi halde efektif oran = nominal oran × profil çarpanı.
 */
export function resolveCollateral(holding: Holding, profile: BrokerProfile): ResolvedCollateral {
  const value = holding.shares * holding.price;
  const nominalRate = holding.collateral;
  const src: CollateralSource = holding.collateralSource ?? 'default-assumption';

  // Kullanıcı hariç tuttu (Gelişmiş Varsayımlar)
  if (holding.excludeFromCollateral) {
    return { rate: 0, displayRate: nominalRate, source: 'unavailable', effectiveValue: 0, value, eligibility: 'ineligible' };
  }

  // Profil menkul kıymeti teminat saymıyor
  if (!profile.securitiesAsCollateral) {
    return { rate: 0, displayRate: nominalRate, source: 'unavailable', effectiveValue: 0, value, eligibility: 'ineligible' };
  }

  // Instrument düzeyinde uygun değil
  if (src === 'unavailable') {
    return { rate: 0, displayRate: 0, source: 'unavailable', effectiveValue: 0, value, eligibility: 'ineligible' };
  }

  // Doğrulanmadı → eligibility'de güvenli %0, ama nominal oran gösterilir
  if (src === 'unknown') {
    return { rate: 0, displayRate: nominalRate, source: 'unknown', effectiveValue: 0, value, eligibility: 'unknown' };
  }

  const rate = nominalRate * profile.securitiesRateFactor;
  return { rate, displayRate: nominalRate, source: src, effectiveValue: value * rate, value, eligibility: 'eligible' };
}

/** Havuza katkı veren her pozisyonun açıklanabilir kırılımı. */
export function perHoldingCollateral(
  data: PortfolioData,
  profile: BrokerProfile
): HoldingCollateral[] {
  return data.holdings.map((h) => {
    const rc = resolveCollateral(h, profile);
    return {
      ticker: h.ticker,
      name: h.name,
      value: rc.value,
      rate: rc.rate,
      displayRate: rc.displayRate,
      effectiveValue: rc.effectiveValue,
      source: rc.source,
      eligibility: rc.eligibility
    };
  });
}

export { DEFAULT_COLLATERAL_RATE };
