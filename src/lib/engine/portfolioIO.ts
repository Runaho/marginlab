import type { Holding, PortfolioData, Sector } from './types';
import { SECTORS } from './presets';

const SECTOR_SET = new Set<string>(SECTORS);

export function serializePortfolio(data: PortfolioData): string {
  const clean: PortfolioData = {
    cash: round(data.cash),
    account: {
      initialMargin: data.account.initialMargin,
      maintenanceMargin: data.account.maintenanceMargin,
      rate: data.account.rate
    },
    holdings: data.holdings.map((h) => ({
      ticker: h.ticker,
      name: h.name,
      shares: h.shares,
      price: round(h.price),
      cost: round(h.cost),
      beta: h.beta,
      collateral: h.collateral,
      sector: h.sector
    }))
  };
  return JSON.stringify(clean, null, 2);
}

export function parsePortfolio(text: string): PortfolioData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Geçersiz JSON: dosya okunamadı. Biçimi kontrol et.');
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Geçersiz portföy: kök nesne bekleniyor.');
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.cash !== 'number' || !isFinite(obj.cash)) {
    throw new Error('"cash" alanı sayı olmalı.');
  }
  const acc = obj.account as Record<string, unknown> | undefined;
  if (!acc || typeof acc.initialMargin !== 'number' || typeof acc.maintenanceMargin !== 'number' || typeof acc.rate !== 'number') {
    throw new Error('"account" alanı initialMargin, maintenanceMargin ve rate içermeli.');
  }
  if (!Array.isArray(obj.holdings)) {
    throw new Error('"holdings" bir dizi olmalı.');
  }

  const holdings: Holding[] = obj.holdings.map((h, i) => {
    const hh = h as Record<string, unknown>;
    if (typeof hh.ticker !== 'string' || !hh.ticker) {
      throw new Error(`holdings[${i}]: "ticker" zorunlu.`);
    }
    const num = (v: unknown, field: string) => {
      if (typeof v !== 'number' || !isFinite(v)) {
        throw new Error(`holdings[${i}] ("${hh.ticker}"): "${field}" sayı olmalı.`);
      }
      return v;
    };
    const sectorRaw = typeof hh.sector === 'string' ? hh.sector : 'Diğer';
    const sector: Sector = SECTOR_SET.has(sectorRaw) ? (sectorRaw as Sector) : 'Diğer';
    return {
      ticker: hh.ticker,
      name: typeof hh.name === 'string' ? hh.name : hh.ticker,
      shares: num(hh.shares, 'shares'),
      price: num(hh.price, 'price'),
      cost: typeof hh.cost === 'number' ? hh.cost : num(hh.price, 'cost'),
      beta: typeof hh.beta === 'number' ? hh.beta : 1,
      collateral: typeof hh.collateral === 'number' ? hh.collateral : 0.75,
      sector
    };
  });

  return {
    cash: obj.cash,
    account: {
      initialMargin: acc.initialMargin,
      maintenanceMargin: acc.maintenanceMargin,
      rate: acc.rate
    },
    holdings
  };
}

export function readPortfolioFile(file: File): Promise<PortfolioData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parsePortfolio(String(reader.result)));
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Bilinmeyen hata'));
      }
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsText(file);
  });
}

export function downloadPortfolio(data: PortfolioData, filename = 'margincall-portfoy.json') {
  const blob = new Blob([serializePortfolio(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
