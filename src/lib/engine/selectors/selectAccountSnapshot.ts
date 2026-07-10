import type { Holding } from '../types';
import type { Settings } from '../settings/types';
import type { BrokerProfileId } from '../marginProfile';
import { resolveProfile, resolveAccountParams, resolveCollateralRisk } from '../account/settingsResolver';
import { calculateCollateral, type CollateralState } from '../account/collateralEngine';

export interface AccountSnapshot {
  cash: number;
  securitiesValue: number;
  netLiquidationValue: number;
  collateral: CollateralState;
  account: { initialMargin: number; maintenanceMargin: number; rate: number };
}

export function selectAccountSnapshot(input: {
  cash: number;
  holdings: Holding[];
  profileId: BrokerProfileId;
  settings: Settings;
}): AccountSnapshot {
  const profile = resolveProfile(input.settings, input.profileId);
  const account = resolveAccountParams(input.settings, input.profileId);
  const risk = resolveCollateralRisk(input.settings);
  const collateral = calculateCollateral(input.cash, input.holdings, profile, risk, account);
  const securitiesValue = input.holdings.reduce((s, h) => s + h.shares * h.price, 0);
  const netLiquidationValue = input.cash + securitiesValue;
  return { cash: input.cash, securitiesValue, netLiquidationValue, collateral, account };
}
