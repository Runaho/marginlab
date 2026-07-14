export type Sector =
  | 'Teknoloji'
  | 'Finans'
  | 'Enerji'
  | 'Sağlık'
  | 'Tüketim'
  | 'Endüstriyel'
  | 'İletişim'
  | 'Diğer';

import type { CollateralSource } from './marginProfile';

export interface Holding {
  ticker: string;
  name: string;
  shares: number;
  /** Güncel piyasa fiyatı */
  price: number;
  /** Alış maliyeti (maliyet bazı) */
  cost: number;
  /** Beta (piyasa duyarlılığı) */
  beta: number;
  /** Teminat oranı: bu pozisyonun değerinin ne kadarı margin kapasitesine sayılır (0-1) */
  collateral: number;
  /** Teminat oranının kaynağı. Yoksa 'default-assumption'. */
  collateralSource?: CollateralSource;
  /** Gelişmiş Varsayımlar: kullanıcı bu pozisyonu collateral havuzundan hariç tuttu mu */
  excludeFromCollateral?: boolean;
  sector: Sector;
}

export interface AccountParams {
  /** Başlangıç teminatı (Reg T için 0.5) */
  initialMargin: number;
  /** Sürdürme teminatı (FINRA standart 0.25) */
  maintenanceMargin: number;
  /** Yıllık margin faiz oranı (örn. 0.08) */
  rate: number;
}

export interface PortfolioData {
  cash: number;
  account: AccountParams;
  holdings: Holding[];
}

export interface EnrichedHolding extends Holding {
  value: number;
  weight: number;
  pl: number;
  plPct: number;
  /** Efektif (haircut sonrası, profile'a göre) teminat değeri */
  collateralValue: number;
  /** Eligibility'de kullanılan efektif oran (0-1) */
  effectiveCollateralRate: number;
  /** Görüntülenecek nominal oran (0-1) */
  displayCollateralRate: number;
  /** Çözümlenmiş kaynak (profile etkisi dahil) */
  resolvedSource: CollateralSource;
}

/** Havuza katkı veren tek pozisyonun açıklanabilir kırılımı. */
export interface HoldingCollateral {
  ticker: string;
  name: string;
  value: number;
  rate: number;
  displayRate: number;
  effectiveValue: number;
  source: CollateralSource;
  eligibility: 'eligible' | 'ineligible' | 'unknown';
}

export interface PortfolioStats {
  holdings: EnrichedHolding[];
  totalInvested: number;
  cash: number;
  total: number;
  cashRatio: number;
  /** Menkul kıymet collateral (haircut sonrası) — geriye dönük uyum için collateralValue */
  collateralValue: number;
  /** Nakit collateral (= cash) */
  cashCollateral: number;
  availableCollateral: number;
  /** Kullanılabilir fon (mevcut yükümlülükler düşülmüş) */
  availableFunds: number;
  /** Fazla likidite = özkaynak - sürdürme yükümlülüğü */
  excessLiquidity: number;
  /** Collateral havuzunun piyasa fiyatına bağlı payı (0-1) */
  pctMarketDependent: number;
  /** Havuza katkı veren pozisyonların açıklanabilir kırılımı */
  perHoldingCollateral: HoldingCollateral[];
  buyingPower: number;
  weightedBeta: number;
  largest: EnrichedHolding | null;
  concentration: number;
  /** Yoğunlaşma profil eşiğini aştı mı (bilgi amaçlı; oran otomatik düşürülmez) */
  concentrationFlag: boolean;
  sectorWeights: Record<string, number>;
  health: number;
  healthNarrative: string;
  alerts: HealthAlert[];
}

export type AlertLevel = 'safe' | 'warning' | 'danger';

export interface HealthAlert {
  level: AlertLevel;
  title: string;
  detail: string;
}

export type MarginAlert = 'safe' | 'warning' | 'danger';

/** Başlangıç teminatı karşılanma statüsü. */
export type EligibilityStatus =
  | 'covered-cash' // Nakit tek başına yeterli
  | 'covered-securities' // Nakit düşük ama portföy collateral'ı ile karşılanıyor
  | 'insufficient'; // Toplam teminat yetersiz

export interface MarginResult {
  price: number;
  shares: number;
  tradeValue: number;
  requiredEquity: number;
  equity: number;
  borrow: number;
  callPrice: number;
  bufferPct: number;
  annualInterest: number;
  canOpen: boolean;
  shortBy: number;
  availableCollateral: number;
  /** Karar kırılımı */
  cash: number;
  securitiesCollateral: number;
  totalCollateral: number;
  availableFunds: number;
  /** Trade sonrası kalan kullanılabilir collateral */
  availableAfterTrade: number;
  /** Yetersizse gereken ek collateral */
  additionalNeeded: number;
  cashSufficient: boolean;
  eligibilityStatus: EligibilityStatus;
  alert: MarginAlert;
  rationale: string;
}

export interface CostBreakdown {
  openCommission: number;
  closeCommission: number;
  spread: number;
  secFee: number;
  custody: number;
  interest: number;
  total: number;
}

export interface ScenarioInput {
  name: string;
  description: string;
  /** Trade'e uygulanan şok yüzdesi (örn. -0.2) */
  tradeShock: number;
  /** Mevcut portföye uygulanan şok yüzdesi */
  portfolioShock: number;
  /** Günlük düşüş oranı (timeline için, örn. -0.03) */
  dailyDrop: number;
  /** Zaman dilimi (gün) */
  days: number;
}

/** Bir gündeki fiyat değişim yüzdesi (basis noktası); path editor anchor'ları bu tipi paylaşır. */
export interface AnchorPoint {
  day: number;
  changePct: number;
}

/**
 * Senaryo girdi şeması — discriminated union.
 * - `flat`: geleneksel (tradeShock + portfolioShock + dailyDrop + days); mevcut 9 predefined senaryo.
 * - `path`: kullanıcı tanımlı günlük yol; tradePath + portfolioPath + interpolation + holdingPeriod.
 *   Ara günler `flattenPathToDailyShocks` ile doldurulur.
 */
export type ScenarioSpec =
  | { kind: 'flat'; tradeShock: number; portfolioShock: number; dailyDrop: number; days: number }
  | { kind: 'path'; tradePath: AnchorPoint[]; portfolioPath: AnchorPoint[]; interpolation: 'linear' | 'step'; holdingPeriod: number };

/** Preset verisini engine'in kabul ettiği spec'e çevirir. */
export function presetToSpec(scenario: ScenarioInput): ScenarioSpec {
  return {
    kind: 'flat',
    tradeShock: scenario.tradeShock,
    portfolioShock: scenario.portfolioShock,
    dailyDrop: scenario.dailyDrop,
    days: scenario.days
  };
}

/** Kullanıcı tanımlı senaryolar — discriminated union. mc-app-state'e `cs` alanında saklanır. */
export type PathInterpolation = 'linear' | 'step';

export interface UserScenarioSimple {
  id: string;
  kind: 'simple';
  name: string;
  tradeShock: number;
  portfolioShock: number;
  dailyDrop: number;
  days: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserScenarioPath {
  id: string;
  kind: 'path';
  name: string;
  /** Eğer predefined senaryodan duplicate edildiyse o senaryonun adı. */
  basedOnScenarioId: string | null;
  tradePath: AnchorPoint[];
  portfolioPath: AnchorPoint[];
  interpolation: PathInterpolation;
  holdingPeriod: number;
  createdAt: string;
  updatedAt: string;
  settingsVersion: string;
}

export type UserScenario = UserScenarioSimple | UserScenarioPath;

/** UserScenario → engine'in kabul ettiği ScenarioSpec'e çevirir. */
export function userScenarioToSpec(s: UserScenario): ScenarioSpec {
  if (s.kind === 'simple') {
    return {
      kind: 'flat',
      tradeShock: s.tradeShock,
      portfolioShock: s.portfolioShock,
      dailyDrop: s.dailyDrop,
      days: s.days
    };
  }
  return {
    kind: 'path',
    tradePath: s.tradePath,
    portfolioPath: s.portfolioPath,
    interpolation: s.interpolation,
    holdingPeriod: s.holdingPeriod
  };
}

/** Validation bounds — settings-driven ileride; v1'de sabit. */
export const SCENARIO_LIMITS = {
  tradePctMin: -1,
  tradePctMax: 3,
  portfolioPctMin: -1,
  portfolioPctMax: 2,
  maxAnchorsPerPath: 50,
  maxCustomScenarios: 20
} as const;

export interface ErosionPoint {
  day: number;
  equityRatio: number;
  marginCalled: boolean;
}

export type FinderMode = 'balanced' | 'safety' | 'upside';
export type ScenarioScope = 'selected' | 'average' | 'worst';

export interface FinderConfig {
  budget: number;
  riskTolerance: 'low' | 'medium' | 'high';
  goal: 'fit' | 'safest' | 'return';
  mode: FinderMode;
  scope: ScenarioScope;
  maxLot: number;
}

export interface FinderCandidate {
  ticker: string;
  name: string;
  sector: Sector;
  shares: number;
  price: number;
  beta: number;
  tradeValue: number;
  borrow: number;
  bufferPct: number;
  netPL: number;
  cashPL: number;
  mcDay: number;
  score: number;
  bestInScenario: string;
  status: AlertLevel;
  rationale: string;
  /** Kaç senaryoda sürdürme sınırının üzerinde kaldığı (dayanıklılık) */
  resilience: number;
  /** Değerlendirilen toplam senaryo sayısı */
  resilienceTotal: number;
}

export interface WatchlistItem {
  ticker: string;
  addedAt: string;
}

export interface DecisionRecord {
  ts: string;
  ticker: string;
  shares: number;
  price: number;
  bufferPct: number;
  mode: FinderMode;
  resilience: string;
  scope: ScenarioScope;
}
