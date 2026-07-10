import type { Holding } from '../types';
import type { Settings } from '../settings/types';
import type { BrokerProfileId } from '../marginProfile';
import { resolveProfile, resolveAccountParams, resolveCollateralRisk } from '../account/settingsResolver';
import { shockMatrix, type ShockMatrix, type TradeSpec, type CombinedInput } from '../account/scenarioEngine';

export function selectMarginCallMap(input: {
  cash: number;
  holdings: Holding[];
  trade: TradeSpec;
  additionalCash: number;
  profileId: BrokerProfileId;
  settings: Settings;
  tradeShocks?: number[];
  portfolioShocks?: number[];
}): ShockMatrix {
  const profile = resolveProfile(input.settings, input.profileId);
  const account = resolveAccountParams(input.settings, input.profileId);
  const risk = resolveCollateralRisk(input.settings);
  const combined: CombinedInput = {
    cash: input.cash,
    holdings: input.holdings,
    trade: input.trade,
    additionalCash: input.additionalCash,
    account,
    profile,
    risk,
    costModel: input.settings.costModel,
    earlyWarningThresholds: input.settings.scenarioEngine.riskThresholds
  };
  return shockMatrix(combined, input.tradeShocks, input.portfolioShocks);
}
