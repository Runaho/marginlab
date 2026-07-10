// Merkezi margin/collateral konfigürasyonu — BROKER-AGNOSTIK, eğitim/simülasyon amaçlı.
// Belirli bir broker adı/markası veya broker'a özel kesin kural KULLANILMAZ.
// Gerçek collateral oranları, margin gereksinimleri ve tasfiye davranışı hesap türüne,
// enstrümana ve broker koşullarına göre değişebilir.
//
// Tüm çalışma-zamanı değerler (profiller, varsayılan oran, disclaimer, etiketler)
// artık src/lib/data/defaults.json üzerinden yüklenir; bkz. ./config.ts.
// Bu modül tipleri tutar ve config değerlerini yeniden dışa aktarır.

/** Bir pozisyonun teminat oranının kaynağı. */
export type CollateralSource =
  | 'broker-data' // Broker verisi (bu modelde üretilmez ama alan hazır)
  | 'default-assumption' // Varsayımsal (DEFAULT_COLLATERAL_RATE)
  | 'user-override' // Kullanıcı düzenledi
  | 'unavailable' // Uygun değil / hariç tutuldu
  | 'unknown'; // Doğrulanmadı (eligibility'de güvenli %0)

export type BrokerProfileId = 'general' | 'cash-first' | 'conservative';

export interface BrokerProfile {
  id: BrokerProfileId;
  label: string;
  shortLabel: string;
  description: string;
  /** Menkul kıymet pozisyonları teminat üretir mi? */
  securitiesAsCollateral: boolean;
  /** Nominal orana uygulanan çarpan (temkinli profillerde <1 olabilir) */
  securitiesRateFactor: number;
  /** Yoğunlaşma riski eşiği (tek pozisyon ağırlığı) */
  concentrationThreshold: number;
}

import {
  BROKER_PROFILES,
  COLLATERAL_SOURCE_LABELS,
  DEFAULT_COLLATERAL_RATE,
  DEFAULT_PROFILE_ID,
  getProfile,
  MARGIN_DISCLAIMER,
  PROFILE_LIST
} from './config';

export {
  BROKER_PROFILES,
  COLLATERAL_SOURCE_LABELS,
  DEFAULT_COLLATERAL_RATE,
  DEFAULT_PROFILE_ID,
  getProfile,
  MARGIN_DISCLAIMER,
  PROFILE_LIST
};
