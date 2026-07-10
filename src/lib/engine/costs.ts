import type { CostBreakdown } from './types';
import type { CostModel } from './settings/types';
import { costLabel } from '$lib/i18n/labels';

export function commission(notional: number, model: CostModel): number {
  const { commissionModel, commissionRate, commissionMin, commissionPerShare } = model;
  switch (commissionModel) {
    case 'per-share':
      return Math.max(model.commissionPerShare, commissionMin);
    case 'fixed':
      return commissionMin;
    case 'none':
      return 0;
    case 'percentage':
    default:
      return Math.max(notional * commissionRate, commissionMin);
  }
}

export function computeCosts(input: {
  shares: number;
  price: number;
  borrow: number;
  holdingDays: number;
  rate: number;
  costModel: CostModel;
}): CostBreakdown {
  const { commissionRate, commissionMin, commissionPerShare, spreadRate, secFeeRate, custodyRate, commissionModel } = input.costModel;
  const notional = input.shares * input.price;

  const openCommission = commission(notional, input.costModel);
  const closeCommission = commission(notional, input.costModel);
  const spread = input.shares * (input.price * spreadRate);
  const secFee = notional * secFeeRate;
  const custody = notional * custodyRate * (input.holdingDays / 365);
  const interest = input.borrow * input.rate * (input.holdingDays / 365);

  const total = openCommission + closeCommission + spread + secFee + custody + interest;
  return { openCommission, closeCommission, spread, secFee, custody, interest, total };
}

export const COST_LABELS: Record<keyof CostBreakdown, string> = {
  openCommission: 'costOpenCommission',
  closeCommission: 'costCloseCommission',
  spread: 'costSpread',
  secFee: 'costSecFee',
  custody: 'costCustody',
  interest: 'costInterest',
  total: 'costTotal'
};