import type {
  AccountParams,
  ErosionPoint,
  ScenarioInput,
  ScenarioResult,
  ScenarioVerdict
} from './types';
import { computeCosts } from './costs';

export function erosionTimeline(input: {
  price: number;
  shares: number;
  borrow: number;
  dailyDrop: number;
  days: number;
  maintenanceMargin: number;
}): { points: ErosionPoint[]; mcDay: number } {
  const points: ErosionPoint[] = [];
  let mcDay = -1;
  for (let d = 0; d <= input.days; d++) {
    const p = input.price * Math.pow(1 + input.dailyDrop, d);
    const value = p * input.shares;
    const equityRatio = value > 0 ? (value - input.borrow) / value : 0;
    const marginCalled = equityRatio < input.maintenanceMargin;
    if (marginCalled && mcDay < 0) mcDay = d;
    points.push({ day: d, equityRatio: equityRatio * 100, marginCalled });
  }
  return { points, mcDay };
}

export function scenarioCalc(input: {
  price: number;
  shares: number;
  equity: number;
  account: AccountParams;
  scenario: ScenarioInput;
  holdingDays: number;
}): ScenarioResult {
  const { price, shares, equity, account, scenario, holdingDays } = input;
  const newPrice = price * (1 + scenario.tradeShock);
  const newValue = newPrice * shares;
  const borrow = Math.max(newValue - equity, 0);

  const marginCosts = computeCosts({
    shares,
    price,
    borrow,
    holdingDays,
    rate: account.rate
  });
  const marginPL = (newPrice - price) * shares - marginCosts.total;

  const cashShares = price > 0 ? Math.floor(equity / price) : 0;
  const cashCosts = computeCosts({
    shares: cashShares,
    price,
    borrow: 0,
    holdingDays,
    rate: account.rate
  });
  const cashPL = (newPrice - price) * cashShares - cashCosts.total;

  const newEquityRatio = newValue > 0 ? (newValue - borrow) / newValue : 0;
  const bufferPct = (newEquityRatio - account.maintenanceMargin) * 100;

  let verdict: ScenarioVerdict;
  if (newEquityRatio < account.maintenanceMargin) verdict = 'Kırılgan';
  else if (bufferPct < 10) verdict = 'Dikkat';
  else verdict = 'Kontrollü';

  const multiplier = cashPL !== 0 ? marginPL / cashPL : 0;

  return {
    newPrice,
    newValue,
    newEquityRatio: newEquityRatio * 100,
    cashPL,
    marginPL,
    verdict,
    multiplier,
    erosion: []
  };
}
