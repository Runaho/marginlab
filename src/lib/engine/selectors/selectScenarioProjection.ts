import type { Holding, ScenarioSpec } from '../types';
import type { Settings } from '../settings/types';
import type { BrokerProfileId } from '../marginProfile';
import { resolveProfile, resolveAccountParams, resolveCollateralRisk } from '../account/settingsResolver';
import { projectScenario, type ScenarioProjection, type TradeSpec, type CombinedInput } from '../account/scenarioEngine';

export function selectScenarioProjection(input: {
  cash: number;
  holdings: Holding[];
  trade: TradeSpec;
  additionalCash: number;
  holdingDays: number;
  profileId: BrokerProfileId;
  settings: Settings;
  spec: ScenarioSpec;
}): ScenarioProjection {
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
  return projectScenario({ ...combined, spec: input.spec, holdingDays: input.holdingDays });
}