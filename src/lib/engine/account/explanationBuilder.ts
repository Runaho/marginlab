import type { DebitLedgerResult } from './debitLedger';

const m = (n: number) => `$${n.toFixed(0)}`;

export function decisionSentence(input: {
  canOpen: boolean;
  requiredInitialMargin: number;
  availableBefore: number;
  availableAfter: number;
}): string {
  if (input.canOpen) {
    return `Bu trade için ${m(input.requiredInitialMargin)} başlangıç teminatı gerekiyor. Mevcut hesabınızda ${m(
      input.availableBefore
    )} kullanılabilir collateral bulunuyor. Trade sonrasında ${m(input.availableAfter)} kapasite kalır.`;
  }
  return `Bu trade için ${m(input.requiredInitialMargin)} başlangıç teminatı gerekiyor; mevcut kullanılabilir collateral ${m(
    input.availableBefore
  )}. ${m(input.requiredInitialMargin - input.availableBefore)} ek collateral gerekiyor.`;
}

export function lowCashSentence(input: {
  cash: number;
  securities: number;
  availableAfter: number;
  securitiesSharePct: number;
}): string {
  return `Nakit ${m(input.cash)}; fakat seçili profil ve varsayımlarda menkul kıymet collateral'ı ${m(
    input.securities
  )} olduğu için trade açılabiliyor. Collateral kapasitesinin %${input.securitiesSharePct.toFixed(
    0
  )} kadarı piyasa fiyatı değişimine bağlıdır.`;
}

export function ledgerSentence(input: {
  ledger: DebitLedgerResult;
  dailyInterest: number;
  totalInterest: number;
  holdingDays: number;
}): string {
  return `Tahmini ledger, "${input.ledger.fundingPolicy}" funding policy'sine göre hesaplanır. Trade sonrası nakit ${m(
    input.ledger.cashAfter
  )}, tahmini debit balance ${m(input.ledger.estimatedDebitBalance)}, ${input.holdingDays} günlük faiz ${m(
    input.totalInterest
  )} (günlük ${m(input.dailyInterest)}).`;
}
