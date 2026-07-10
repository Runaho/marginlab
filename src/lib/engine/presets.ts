import type { Holding, ScenarioInput, Sector } from './types';
import defaultPortfolio from '../data/defaultPortfolio.json';

export const DEFAULT_PORTFOLIO = defaultPortfolio as unknown as {
  cash: number;
  account: { initialMargin: number; maintenanceMargin: number; rate: number };
  holdings: Holding[];
};

/** Senaryo kütüphanesi — 8 hazır stres testi (read-04) */
export const SCENARIOS: ScenarioInput[] = [
  {
    name: 'Bull',
    description: 'Güçlü yükseliş ortamı. Piyasa ve trade birlikte değer kazanır.',
    tradeShock: 0.3,
    portfolioShock: 0.15,
    dailyDrop: 0.0,
    days: 12
  },
  {
    name: 'Hype',
    description: 'Aşırı iyimserlik. Trade size abartılı prim yapar, portföy sadece hafif yükselir.',
    tradeShock: 0.45,
    portfolioShock: 0.05,
    dailyDrop: 0.0,
    days: 12
  },
  {
    name: 'Low Dip',
    description: 'Hafif düzeltme. Her şey yüzde 8 geriler.',
    tradeShock: -0.08,
    portfolioShock: -0.08,
    dailyDrop: -0.01,
    days: 12
  },
  {
    name: 'Peak',
    description: 'Zirve tükenmesi ~ S&P düzeltmesi Haziran 2022. Trade sert, portföy orta şok.',
    tradeShock: -0.28,
    portfolioShock: -0.15,
    dailyDrop: -0.03,
    days: 12
  },
  {
    name: 'Slow Bleed',
    description: 'Yavaş kanama. Uzun vadeli kademeli erime, günde %1 düşüş.',
    tradeShock: -0.18,
    portfolioShock: -0.18,
    dailyDrop: -0.01,
    days: 12
  },
  {
    name: 'Credit Stress',
    description: 'Sessiz katil. Mevcut portföy değer kaybeder, trade yerinde sayar.',
    tradeShock: 0.0,
    portfolioShock: -0.2,
    dailyDrop: 0.0,
    days: 12
  },
  {
    name: 'Tech Selloff',
    description: 'Teknoloji satışı ~ NASDAQ düzeltmesi Q4 2022. Teknoloji ağırlıklı portföyü vurur.',
    tradeShock: -0.22,
    portfolioShock: -0.25,
    dailyDrop: -0.02,
    days: 12
  },
  {
    name: 'Recovery',
    description: 'Toparlanma. Şok sonrası piyasa yeniden yükselişe geçer.',
    tradeShock: 0.18,
    portfolioShock: 0.12,
    dailyDrop: 0.0,
    days: 12
  },
  {
    name: 'Flat',
    description: 'Fiyat yerinde sayar. Sadece taşıma maliyeti (faiz) sessizce işler — kâr eşiği budur.',
    tradeShock: 0.0,
    portfolioShock: 0.0,
    dailyDrop: 0.0,
    days: 12
  }
];

/** Bulucu evreni artık marketData.json'dan türetiliyor (bkz. market.ts). */

export const SECTORS: Sector[] = [
  'Teknoloji',
  'Finans',
  'Enerji',
  'Sağlık',
  'Tüketim',
  'Endüstriyel',
  'İletişim',
  'Diğer'
];
