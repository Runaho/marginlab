import type {
  ErosionPoint,
  ScenarioInput
} from '$lib/engine/types';

export function erosionTimeline(input: {
  price: number;
  shares: number;
  borrow: number;
  dailyDrop: number;
  days: number;
  maintenanceMargin: number;
  rate: number;
}): { points: ErosionPoint[]; interestPoints: ErosionPoint[]; mcDay: number } {
  const points: ErosionPoint[] = [];
  const interestPoints: ErosionPoint[] = [];
  let mcDay = -1;
  const baseValue = input.price * input.shares;
  for (let d = 0; d <= input.days; d++) {
    const p = input.price * Math.pow(1 + input.dailyDrop, d);
    const value = p * input.shares;
    const equityRatio = value > 0 ? (value - input.borrow) / value : 0;
    const marginCalled = equityRatio < input.maintenanceMargin;
    if (marginCalled && mcDay < 0) mcDay = d;
    points.push({ day: d, equityRatio: equityRatio * 100, marginCalled });

    // Faiz/taşıma maliyeti etkisi: fiyat sabit, sadece birikmiş faiz özkaynağı eritir
    const cumInterest = (input.borrow * input.rate * d) / 365;
    const eqInt = baseValue > 0 ? (baseValue - input.borrow - cumInterest) / baseValue : 0;
    interestPoints.push({
      day: d,
      equityRatio: eqInt * 100,
      marginCalled: eqInt < input.maintenanceMargin
    });
  }
  return { points, interestPoints, mcDay };
}