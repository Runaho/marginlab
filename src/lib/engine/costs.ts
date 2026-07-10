import type { CostBreakdown } from './types';

const COMMISSION_RATE = 0.0025; // %0.25
const COMMISSION_MIN = 1.0; // min 1 USD
const HALF_SPREAD = 0.005; // tick 0.01 => yarım spread 0.005
const SEC_FEE_RATE = 0.0000206; // satış tarafı %0.00206
const CUSTODY_RATE = 0.0005; // yıllık %0.05

export function commission(notional: number): number {
  return Math.max(notional * COMMISSION_RATE, COMMISSION_MIN);
}

export function computeCosts(input: {
  shares: number;
  price: number;
  borrow: number;
  holdingDays: number;
  rate: number;
}): CostBreakdown {
  const notional = input.shares * input.price;
  const openCommission = commission(notional);
  const closeCommission = commission(notional);
  const spread = input.shares * HALF_SPREAD * 2;
  const secFee = notional * SEC_FEE_RATE;
  const custody = notional * CUSTODY_RATE * (input.holdingDays / 365);
  const interest = input.borrow * input.rate * (input.holdingDays / 365);
  const total = openCommission + closeCommission + spread + secFee + custody + interest;
  return { openCommission, closeCommission, spread, secFee, custody, interest, total };
}

export const COST_LABELS: Record<keyof CostBreakdown, string> = {
  openCommission: 'Açılış komisyonu',
  closeCommission: 'Kapanış komisyonu',
  spread: 'Spread (alış-satış farkı)',
  secFee: 'SEC işlem ücreti (satış)',
  custody: 'Saklama ücreti (pro-rate)',
  interest: 'Margin faizi (taşıma maliyeti)',
  total: 'Toplam maliyet'
};
