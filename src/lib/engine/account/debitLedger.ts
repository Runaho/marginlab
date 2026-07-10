import type { FundingPolicy } from '../settings/types';

export interface DebitLedgerResult {
  cashBefore: number;
  additionalCash: number;
  tradeMarketValue: number;
  openingCosts: number;
  /** Nakit önce harcanır, kalanı trade değerini karşılamazsa borçlanılır. */
  cashOutlay: number;
  cashAfter: number;
  estimatedDebitBalance: number;
  fundingPolicy: FundingPolicy;
}

/**
 * Trade sonrası nakit ve borç (debit) ledger'ı. Collateral uygunluğundan BAĞIMSIZDIR;
 * bu yalnızca nakit hareketini ve tahmini margin borcunu gösterir (spec §2-C).
 */
export function estimateDebitLedger(input: {
  cashBefore: number;
  additionalCash: number;
  tradeMarketValue: number;
  openingCosts: number;
  existingDebit: number;
  policy: FundingPolicy;
}): DebitLedgerResult {
  const { cashBefore, additionalCash, tradeMarketValue, openingCosts, existingDebit, policy } = input;
  const availableCash = cashBefore + additionalCash;

  if (policy === 'debit-first') {
    // Önce borçlanır, nakit dokunulmadan kalır.
    const cashAfter = availableCash;
    const estimatedDebitBalance = Math.max(
      0,
      existingDebit + tradeMarketValue + openingCosts
    );
    return {
      cashBefore,
      additionalCash,
      tradeMarketValue,
      openingCosts,
      cashOutlay: 0,
      cashAfter,
      estimatedDebitBalance,
      fundingPolicy: policy
    };
  }

  // cash-first-then-debit (varsayılan)
  const cashOutlay = Math.min(availableCash, tradeMarketValue);
  const cashAfter = availableCash - cashOutlay;
  const estimatedDebitBalance = Math.max(
    0,
    existingDebit + tradeMarketValue + openingCosts - cashOutlay
  );
  return {
    cashBefore,
    additionalCash,
    tradeMarketValue,
    openingCosts,
    cashOutlay,
    cashAfter,
    estimatedDebitBalance,
    fundingPolicy: policy
  };
}
