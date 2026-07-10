import { describe, it, expect } from 'vitest';
import type { Holding, Sector } from '../types';
import { seedSettings } from '../settings/defaults';
import { validateSettings } from '../settings/validate';
import type { Settings } from '../settings/types';
import { selectTradeImpact } from '../selectors/selectTradeImpact';
import { selectAccountSnapshot } from '../selectors/selectAccountSnapshot';
import { selectScenarioProjection } from '../selectors/selectScenarioProjection';
import { selectMarginCallMap } from '../selectors/selectMarginCallMap';
import type { TradeSpec } from '../account/scenarioEngine';

function holding(ticker: string, shares: number, price: number, sector: Sector = 'Teknoloji'): Holding {
  return {
    ticker,
    name: ticker,
    shares,
    price,
    cost: price,
    beta: 1.3,
    collateral: 0.75,
    collateralSource: 'default-assumption',
    excludeFromCollateral: false,
    sector
  };
}

function trade(ticker: string, shares: number, price: number, sector: Sector = 'Teknoloji'): TradeSpec {
  return { ticker, name: ticker, shares, price, cost: price, beta: 1.3, sector, collateral: 0.75 };
}

const baseSettings = (): Settings => seedSettings();

describe('Spec §8.1 — Düşük nakit + yeterli securities collateral', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)]; // value 1022.67 -> collateral 767.0
  const settings = baseSettings();

  it('trade açılabilir; ek nakit 0 iken collateral üzerinden uygunluk doğru', () => {
    const r = selectTradeImpact({
      cash,
      holdings,
      trade: trade('NVDA', 3, 200),
      additionalCash: 0,
      holdingDays: 30,
      profileId: 'general',
      settings
    });
    expect(r.tradeValue).toBeCloseTo(600, 2);
    expect(r.requiredInitialMargin).toBeCloseTo(300, 2);
    expect(r.cashCollateral).toBeCloseTo(45.16, 2);
    expect(r.securitiesCollateral).toBeCloseTo(767.0, 1);
    expect(r.totalCollateralPool).toBeCloseTo(812.16, 1);
    expect(r.availableInitialBefore).toBeGreaterThanOrEqual(r.requiredInitialMargin - 1);
    expect(r.canOpen).toBe(true);
    expect(r.eligibility).toBe('covered-securities');
  });

  it('collateral uygunluğu ile cash/debit ledger ayrı hesaplanır', () => {
    const r = selectTradeImpact({
      cash,
      holdings,
      trade: trade('NVDA', 3, 200),
      additionalCash: 0,
      holdingDays: 30,
      profileId: 'general',
      settings
    });
    // Nakit yetersiz olduğu için borç = trade değeri - nakit
    expect(r.ledger.estimatedDebitBalance).toBeCloseTo(600 - 45.16, 2);
    expect(r.ledger.cashAfter).toBeCloseTo(0, 2);
  });
});

describe('Spec §8.2 — Ek nakit yatırma', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)];
  const settings = baseSettings();

  it('ek nakit arttıkça debit azalır, nakit sonrası artar', () => {
    const noExtra = selectTradeImpact({ cash, holdings, trade: trade('NVDA', 3, 200), additionalCash: 0, holdingDays: 30, profileId: 'general', settings });
    const withExtra = selectTradeImpact({ cash, holdings, trade: trade('NVDA', 3, 200), additionalCash: 900, holdingDays: 30, profileId: 'general', settings });
    expect(withExtra.ledger.cashAfter).toBeCloseTo(45.16 + 900 - 600, 2);
    expect(withExtra.ledger.estimatedDebitBalance).toBeCloseTo(0, 2);
    expect(withExtra.eligibility).toBe('covered-cash');
    expect(withExtra.totalInterest).toBeLessThan(noExtra.totalInterest);
  });
});

describe('Spec §8.3 — Yetersiz collateral', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)];
  const settings = baseSettings();

  it('trade açılmaz; shortBy pozitif', () => {
    const r = selectTradeImpact({ cash, holdings, trade: trade('NVDA', 4, 200), additionalCash: 0, holdingDays: 30, profileId: 'general', settings });
    expect(r.canOpen).toBe(false);
    expect(r.eligibility).toBe('insufficient');
    expect(r.shortBy).toBeCloseTo(r.requiredInitialMargin - r.availableInitialBefore, 2);
  });
});

describe('Spec §8.4 — Portföy şoku', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)];
  const settings = baseSettings();

  it('portföy düşünce securities collateral ve buffer düşer', () => {
    const proj = selectScenarioProjection({
      cash,
      holdings,
      trade: trade('NVDA', 3, 200),
      additionalCash: 0,
      holdingDays: 12,
      profileId: 'general',
      settings,
      scenario: { dailyDrop: 0, tradeShock: 0, portfolioShock: -0.3, holdingPeriod: 1 }
    });
    const day0 = proj.days[0];
    const terminal = proj.days[proj.days.length - 1];
    expect(terminal.collateral.securitiesCollateral).toBeLessThan(day0.collateral.securitiesCollateral);
    expect(terminal.bufferPct).toBeLessThan(day0.bufferPct);
  });
});

describe('Spec §8.5 — Yeni trade şoku', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)];
  const settings = baseSettings();

  it('trade düşünce equity/debit ve risk eşikleri değişir', () => {
    const proj = selectScenarioProjection({
      cash,
      holdings,
      trade: trade('NVDA', 3, 200),
      additionalCash: 0,
      holdingDays: 12,
      profileId: 'general',
      settings,
      scenario: { dailyDrop: 0, tradeShock: -0.4, portfolioShock: 0, holdingPeriod: 1 }
    });
    const day0 = proj.days[0];
    const terminal = proj.days[proj.days.length - 1];
    expect(terminal.tradeValue).toBeLessThan(day0.tradeValue);
  });
});

describe('Spec §8.6 — Birleşik şok + interest', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)];
  const settings = baseSettings();

  it('günlük düşüşte faiz birikir, buffer azalır', () => {
    const proj = selectScenarioProjection({
      cash,
      holdings,
      trade: trade('NVDA', 3, 200),
      additionalCash: 0,
      holdingDays: 30,
      profileId: 'general',
      settings,
      scenario: { dailyDrop: -0.02, tradeShock: 0, portfolioShock: 0, holdingPeriod: 30 }
    });
    const last = proj.days[proj.days.length - 1];
    expect(last.accruedInterest).toBeGreaterThan(0);
    expect(last.bufferPct).toBeLessThan(proj.days[0].bufferPct);
  });
});

describe('Spec §8.7 — Collateral rate override (tek kaynak)', () => {
  const cash = 45.16;
  const settings = baseSettings();

  it('oran değişince snapshot ve impact aynı merkezi sonucu verir', () => {
    const holdings = [holding('X', 10, 102.267)];
    const before = selectAccountSnapshot({ cash, holdings, profileId: 'general', settings });
    const impactBefore = selectTradeImpact({ cash, holdings, trade: trade('NVDA', 3, 200), additionalCash: 0, holdingDays: 30, profileId: 'general', settings });

    const overridden = holdings.map((h) => ({ ...h, collateral: 0.5 }));
    const after = selectAccountSnapshot({ cash, holdings: overridden, profileId: 'general', settings });
    const impactAfter = selectTradeImpact({ cash, holdings: overridden, trade: trade('NVDA', 3, 200), additionalCash: 0, holdingDays: 30, profileId: 'general', settings });

    expect(after.collateral.securitiesCollateral).toBeLessThan(before.collateral.securitiesCollateral);
    // snapshot ve impact aynı engine'i kullanır
    expect(impactAfter.securitiesCollateral).toBeCloseTo(after.collateral.securitiesCollateral, 6);
    expect(impactBefore.collateral.securitiesCollateral).toBeCloseTo(before.collateral.securitiesCollateral, 6);
  });
});

describe('Spec §8.8 — Ayar değişikliği', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)];

  it('initial margin ayarı değişince hard-coded kalmadan sonuç güncellenir', () => {
    const s1 = baseSettings();
    const r1 = selectTradeImpact({ cash, holdings, trade: trade('NVDA', 3, 200), additionalCash: 0, holdingDays: 30, profileId: 'general', settings: s1 });

    const s2 = baseSettings();
    s2.globalDefaults.initialMarginRate = 0.6;
    s2.accountProfiles.general.initialMarginRate = 0.6;
    const r2 = selectTradeImpact({ cash, holdings, trade: trade('NVDA', 3, 200), additionalCash: 0, holdingDays: 30, profileId: 'general', settings: s2 });

    expect(r2.requiredInitialMargin).toBeCloseTo(r1.tradeValue * 0.6, 2);
    expect(r2.requiredInitialMargin).toBeGreaterThan(r1.requiredInitialMargin);
    expect(r2.canOpen).toBe(false);
  });
});

describe('Spec §8.9 — Veri tazeliği / ayar güvenliği', () => {
  it('negatif faiz ayar olarak reddedilir', () => {
    const s = baseSettings();
    s.globalDefaults.annualMarginRate = -0.05;
    const issues = validateSettings(s);
    expect(issues.some((i) => i.level === 'error')).toBe(true);
  });

  it('maintenance > initial ayarı uyarı üretir', () => {
    const s = baseSettings();
    s.globalDefaults.initialMarginRate = 0.2;
    s.globalDefaults.maintenanceMarginRate = 0.25;
    const issues = validateSettings(s);
    expect(issues.some((i) => i.level === 'warning')).toBe(true);
  });
});

describe('Spec §8.10 — Sınır değerler', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)];
  const settings = baseSettings();

  it('0 adet → trade değeri 0, açılabilir', () => {
    const r = selectTradeImpact({ cash, holdings, trade: trade('NVDA', 0, 200), additionalCash: 0, holdingDays: 30, profileId: 'general', settings });
    expect(r.tradeValue).toBe(0);
    expect(r.canOpen).toBe(true);
  });

  it('çok büyük adet → yetersiz', () => {
    const r = selectTradeImpact({ cash, holdings, trade: trade('NVDA', 1000, 200), additionalCash: 0, holdingDays: 30, profileId: 'general', settings });
    expect(r.canOpen).toBe(false);
  });

  it('collateral oranı %0 → menkul kıymet collateral 0', () => {
    const overridden = holdings.map((h) => ({ ...h, collateral: 0 }));
    const snap = selectAccountSnapshot({ cash, holdings: overridden, profileId: 'general', settings });
    expect(snap.collateral.securitiesCollateral).toBe(0);
  });

  it('collateral oranı %100 → tam değer sayılır', () => {
    const overridden = holdings.map((h) => ({ ...h, collateral: 1 }));
    const snap = selectAccountSnapshot({ cash, holdings: overridden, profileId: 'general', settings });
    expect(snap.collateral.securitiesCollateral).toBeCloseTo(1022.67, 1);
  });

  it('buffer sürdürme sınırında → margin-call', () => {
    // Nakit=0, tek hisse, borçsuz; equity≈maintenance -> buffer≈0
    const r = selectTradeImpact({ cash: 0, holdings: [], trade: trade('NVDA', 1, 100), additionalCash: 0, holdingDays: 30, profileId: 'general', settings });
    expect(r.buffer).toBeLessThanOrEqual(0.0001);
  });
});

describe('Margin Call Haritası (şok matrisi)', () => {
  const cash = 45.16;
  const holdings = [holding('X', 10, 102.267)];
  const settings = baseSettings();

  it('matris hücreleri risk durumu taşır', () => {
    const matrix = selectMarginCallMap({ cash, holdings, trade: trade('NVDA', 3, 200), additionalCash: 0, profileId: 'general', settings });
    expect(matrix.cells.length).toBeGreaterThan(0);
    expect(matrix.cells[0].length).toBeGreaterThan(0);
    const flat = matrix.cells.flat();
    expect(flat.some((c) => c.riskStatus === 'controlled')).toBe(true);
  });
});
