import type {
  AccountParams,
  AlertLevel,
  EnrichedHolding,
  HealthAlert,
  Holding,
  PortfolioData,
  PortfolioStats
} from './types';

export function enrichHolding(
  h: Holding,
  totalInvested: number
): EnrichedHolding {
  const value = h.shares * h.price;
  const costValue = h.shares * h.cost;
  const pl = value - costValue;
  return {
    ...h,
    value,
    weight: totalInvested > 0 ? value / totalInvested : 0,
    pl,
    plPct: costValue > 0 ? pl / costValue : 0,
    collateralValue: value * h.collateral
  };
}

export function portfolioStats(data: PortfolioData): PortfolioStats {
  const { cash, account, holdings } = data;
  const totalInvested = holdings.reduce((s, h) => s + h.shares * h.price, 0);
  const enriched = holdings
    .map((h) => enrichHolding(h, totalInvested))
    .sort((a, b) => b.value - a.value);

  const collateralValue = enriched.reduce((s, h) => s + h.collateralValue, 0);
  const availableCollateral = cash + collateralValue;
  const total = totalInvested + cash;
  const cashRatio = total > 0 ? cash / total : 0;
  const buyingPower =
    account.initialMargin > 0 ? availableCollateral / account.initialMargin : 0;

  const weightedBeta =
    totalInvested > 0
      ? enriched.reduce((s, h) => s + h.weight * h.beta, 0)
      : 0;

  const largest = enriched.length ? enriched[0] : null;
  const concentration = largest ? largest.weight : 0;

  const sectorWeights: Record<string, number> = {};
  for (const h of enriched) {
    sectorWeights[h.sector] = (sectorWeights[h.sector] ?? 0) + h.weight;
  }

  const { health, healthNarrative } = healthScore({
    cashRatio,
    concentration,
    weightedBeta
  });

  const alerts = healthAlerts({ cashRatio, concentration, weightedBeta, health });

  return {
    holdings: enriched,
    totalInvested,
    cash,
    total,
    cashRatio,
    collateralValue,
    availableCollateral,
    buyingPower,
    weightedBeta,
    largest,
    concentration,
    sectorWeights,
    health,
    healthNarrative,
    alerts
  };
}

function healthScore(input: {
  cashRatio: number;
  concentration: number;
  weightedBeta: number;
}): { health: number; healthNarrative: string } {
  let health = 100;
  const reasons: string[] = [];

  if (input.cashRatio < 0.1) {
    health -= 18;
    reasons.push('nakit oranı düşük');
  }
  if (input.concentration > 0.4) {
    health -= 24;
    reasons.push('tek pozisyon ağırlığı yüksek');
  } else if (input.concentration > 0.3) {
    health -= 14;
    reasons.push('yoğunlaşma var');
  }
  if (input.weightedBeta > 1.6) {
    health -= 22;
    reasons.push('ağırlıklı beta yüksek');
  } else if (input.weightedBeta > 1.3) {
    health -= 12;
    reasons.push('beta ortalamanın üstünde');
  }

  health = Math.max(0, Math.min(100, Math.round(health)));
  const healthNarrative =
    reasons.length > 0
      ? `Sağlık ${health}/100 — ${reasons.join(', ')}.`
      : `Sağlık ${health}/100 — dengeli ve dayanıklı bir yapı.`;
  return { health, healthNarrative };
}

function healthAlerts(input: {
  cashRatio: number;
  concentration: number;
  weightedBeta: number;
  health: number;
}): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  if (input.cashRatio < 0.05) {
    alerts.push({
      level: 'danger',
      title: 'Nakit kritik seviyede',
      detail:
        'Nakdin portföyün yüzde 5′inden az. Margin call için satış yapmadan müdahale alanın yok denecek kadar dar.'
    });
  } else if (input.cashRatio < 0.1) {
    alerts.push({
      level: 'warning',
      title: 'Nakit tamponu ince',
      detail:
        'Nakit oranın yüzde 10′ın altında. Küçük bir düşüşte dahi ek teminat zorunluluğu doğabilir.'
    });
  }
  if (input.concentration > 0.4) {
    alerts.push({
      level: 'danger',
      title: 'Aşırı yoğunlaşma',
      detail:
        'Tek bir pozisyon portföyün yüzde 40′ından fazla. Broker teminat indirimi (haircut) uygulayabilir, çeşitlendirme kaybolur.'
    });
  } else if (input.concentration > 0.3) {
    alerts.push({
      level: 'warning',
      title: 'Yoğunlaşma takip edilmeli',
      detail:
        'En büyük pozisyonun ağırlığı yüzde 30′ın üstünde. Sektör çeşitlendirmesini gözden geçir.'
    });
  }
  if (input.weightedBeta > 1.6) {
    alerts.push({
      level: 'warning',
      title: 'Yüksek piyasa duyarlılığı',
      detail:
        'Ağırlıklı beta 1.6′nın üstünde; piyasa düşüşlerinde portföyün ortalamadan hızlı erir.'
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      level: 'safe',
      title: 'Yapı sağlam görünüyor',
      detail:
        'Nakit, yoğunlaşma ve beta değerlerin dengeli. Bu yapıyı koruyarak margin kullanabilirsin.'
    });
  }
  return alerts;
}

export function topLevel(alerts: HealthAlert[]): AlertLevel {
  if (alerts.some((a) => a.level === 'danger')) return 'danger';
  if (alerts.some((a) => a.level === 'warning')) return 'warning';
  return 'safe';
}

export function accountDefaults(): AccountParams {
  return { initialMargin: 0.5, maintenanceMargin: 0.25, rate: 0.08 };
}
