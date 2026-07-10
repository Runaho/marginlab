export function dailyInterest(debitBalance: number, annualRate: number): number {
  return (debitBalance * annualRate) / 365;
}

export function totalInterest(debitBalance: number, annualRate: number, days: number): number {
  return (debitBalance * annualRate * days) / 365;
}
