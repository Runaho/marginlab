import type { AccountParams, MarginAlert, MarginResult } from './types';

export function marginCalc(input: {
  price: number;
  shares: number;
  equity: number;
  account: AccountParams;
  availableCollateral: number;
}): MarginResult {
  const { price, shares, equity, account, availableCollateral } = input;
  const tradeValue = price * shares;
  const requiredEquity = tradeValue * account.initialMargin;
  const borrow = Math.max(tradeValue - equity, 0);
  const canOpen = availableCollateral >= requiredEquity;
  const shortBy = Math.max(requiredEquity - availableCollateral, 0);

  const callPrice =
    shares > 0 ? borrow / (shares * (1 - account.maintenanceMargin)) : 0;
  const bufferPct = price > 0 ? ((price - callPrice) / price) * 100 : 0;
  const annualInterest = borrow * account.rate;

  let alert: MarginAlert = 'safe';
  if (bufferPct <= 0) alert = 'danger';
  else if (bufferPct < 10) alert = 'warning';

  let rationale: string;
  if (!canOpen) {
    rationale = `Teminat yetersiz: mevcut ${availableCollateral.toFixed(
      0
    )} USD teminata karşı ${requiredEquity.toFixed(0)} USD gerekiyor (${shortBy.toFixed(
      0
    )} USD eksik). Lot düşür veya mevcut pozisyon teminat oranını artır.`;
  } else if (alert === 'danger') {
    rationale =
      'Bu trade bugün açılabilir ama seçili senaryoda zaten margin call bölgesinde. Fiyat sabit kalsa bile call fiyatının üstündesin.';
  } else if (alert === 'warning') {
    rationale = `Buffer sadece %${bufferPct.toFixed(
      1
    )}. Herhangi bir hissede küçük bir düşüş seni margin call sınırına iter.`;
  } else {
    rationale = `Buffer %${bufferPct.toFixed(
      1
    )} — fiyatlar bu seviyeye kadar düşebilir ve hâlâ güvendesin.`;
  }

  return {
    price,
    shares,
    tradeValue,
    requiredEquity,
    equity,
    borrow,
    callPrice,
    bufferPct,
    annualInterest,
    canOpen,
    shortBy,
    availableCollateral,
    alert,
    rationale
  };
}
