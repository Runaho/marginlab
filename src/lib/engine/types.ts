export type Sector =
  | 'Teknoloji'
  | 'Finans'
  | 'Enerji'
  | 'Sağlık'
  | 'Tüketim'
  | 'Endüstriyel'
  | 'İletişim'
  | 'Diğer';

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
  collateralValue: number;
}

export interface PortfolioStats {
  holdings: EnrichedHolding[];
  totalInvested: number;
  cash: number;
  total: number;
  cashRatio: number;
  collateralValue: number;
  availableCollateral: number;
  buyingPower: number;
  weightedBeta: number;
  largest: EnrichedHolding | null;
  concentration: number;
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

export type ScenarioVerdict = 'Kontrollü' | 'Dikkat' | 'Kırılgan';

export interface ScenarioResult {
  newPrice: number;
  newValue: number;
  newEquityRatio: number;
  cashPL: number;
  marginPL: number;
  verdict: ScenarioVerdict;
  multiplier: number;
  erosion: ErosionPoint[];
}

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
}
