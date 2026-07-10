import type { AccountParams } from '../types';

/** Hesap-seviyeli call fiyatı: borç (debit) sürdürme sınırını kırdığı fiyattır. */
export function accountCallPrice(debitBalance: number, shares: number, account: AccountParams): number {
  if (shares <= 0) return 0;
  return debitBalance / (shares * (1 - account.maintenanceMargin));
}

/** Mevcut fiyat ile call fiyatı arasındaki yüzdesel mesafe (buffer). */
export function bufferPct(currentPrice: number, callPrice: number): number {
  if (currentPrice <= 0) return 0;
  return ((currentPrice - callPrice) / currentPrice) * 100;
}
