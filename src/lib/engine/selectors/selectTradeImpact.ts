import type { Holding, AccountParams } from '../types';
import type { Settings } from '../settings/types';
import type { BrokerProfileId } from '../marginProfile';
import { resolveProfile, resolveAccountParams, resolveCollateralRisk } from '../account/settingsResolver';
import { calculateCollateral, type CollateralState } from '../account/collateralEngine';
import { estimateDebitLedger, type DebitLedgerResult } from '../account/debitLedger';
import { dailyInterest, totalInterest } from '../account/interestEngine';
import { accountCallPrice, bufferPct } from '../account/marginEngine';
import { decisionSentence, lowCashSentence, ledgerSentence } from '../account/explanationBuilder';
import type { TradeSpec } from '../account/scenarioEngine';

export type Eligibility = 'covered-cash' | 'covered-securities' | 'insufficient';

export interface TradeImpactResult {
  // Trade-level (spec §2-A)
  tradeValue: number;
  requiredInitialMargin: number;
  theoreticalMaxLoan: number;
  // Account-level collateral (spec §2-B)
  cashCollateral: number;
  securitiesCollateral: number;
  totalCollateralPool: number;
  existingInitialReq: number;
  availableInitialBefore: number;
  availableInitialAfter: number;
  canOpen: boolean;
  eligibility: Eligibility;
  shortBy: number;
  // Cash / debit ledger (spec §2-C)
  ledger: DebitLedgerResult;
  dailyInterest: number;
  totalInterest: number;
  // Per-trade risk
  callPrice: number;
  buffer: number;
  // Support breakdown
  collateral: CollateralState;
  // Dynamic explanations
  decisionRationale: string;
  lowCashNote: string;
  ledgerNote: string;
}

export interface TradeImpactInput {
  cash: number;
  holdings: Holding[];
  trade: TradeSpec;
  additionalCash: number;
  holdingDays: number;
  profileId: BrokerProfileId;
  settings: Settings;
}

export function selectTradeImpact(input: TradeImpactInput): TradeImpactResult {
  const profile = resolveProfile(input.settings, input.profileId);
  const account: AccountParams = resolveAccountParams(input.settings, input.profileId);
  const risk = resolveCollateralRisk(input.settings);

  // Ek nakit, trade öncesi hesaba yatırılır; collateral havuzunun nakit tarafına eklenir (spec §3).
  const preCash = input.cash + input.additionalCash;
  const collateral = calculateCollateral(preCash, input.holdings, profile, risk, account);
  const tradeValue = input.trade.shares * input.trade.price;
  const requiredInitialMargin = tradeValue * account.initialMargin;
  const theoreticalMaxLoan = tradeValue - requiredInitialMargin;

  const availableInitialBefore = collateral.availableFunds;
  const canOpen = availableInitialBefore >= requiredInitialMargin;
  const availableInitialAfter = availableInitialBefore - requiredInitialMargin;
  const shortBy = Math.max(requiredInitialMargin - availableInitialBefore, 0);

  const ledger = estimateDebitLedger({
    cashBefore: input.cash,
    additionalCash: input.additionalCash,
    tradeMarketValue: tradeValue,
    openingCosts: 0,
    existingDebit: 0,
    policy: profile.fundingPolicy
  });
  const dailyInt = dailyInterest(ledger.estimatedDebitBalance, account.rate);
  const totalInt = totalInterest(ledger.estimatedDebitBalance, account.rate, input.holdingDays);

  const callPrice = accountCallPrice(ledger.estimatedDebitBalance, input.trade.shares, account);
  const buffer = bufferPct(input.trade.price, callPrice);

  const cashSufficient = collateral.cashCollateral >= requiredInitialMargin;
  const eligibility: Eligibility = !canOpen
    ? 'insufficient'
    : cashSufficient
      ? 'covered-cash'
      : 'covered-securities';

  const securitiesSharePct =
    collateral.totalCollateral > 0 ? (collateral.securitiesCollateral / collateral.totalCollateral) * 100 : 0;

  const decisionRationale = decisionSentence({
    canOpen,
    requiredInitialMargin,
    availableBefore: availableInitialBefore,
    availableAfter: availableInitialAfter
  });
  const lowCashNote = lowCashSentence({
    cash: collateral.cashCollateral,
    securities: collateral.securitiesCollateral,
    availableAfter: availableInitialAfter,
    securitiesSharePct
  });
  const ledgerNote = ledgerSentence({ ledger, dailyInterest: dailyInt, totalInterest: totalInt, holdingDays: input.holdingDays });

  return {
    tradeValue,
    requiredInitialMargin,
    theoreticalMaxLoan,
    cashCollateral: collateral.cashCollateral,
    securitiesCollateral: collateral.securitiesCollateral,
    totalCollateralPool: collateral.totalCollateral,
    existingInitialReq: collateral.existingInitialReq,
    availableInitialBefore,
    availableInitialAfter,
    canOpen,
    eligibility,
    shortBy,
    ledger,
    dailyInterest: dailyInt,
    totalInterest: totalInt,
    callPrice,
    buffer,
    collateral,
    decisionRationale,
    lowCashNote,
    ledgerNote
  };
}
