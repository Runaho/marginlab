export function fmtMoney(n: number, opts: { sign?: boolean } = {}): string {
  const v = isFinite(n) ? n : 0;
  const s = v.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return (opts.sign && v > 0 ? '+' : '') + '$' + s;
}

export function fmtNum(n: number, digits = 2): string {
  const v = isFinite(n) ? n : 0;
  return v.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export function fmtPct(n: number, digits = 1): string {
  const v = isFinite(n) ? n : 0;
  return (
    (v > 0 ? '+' : '') +
    v.toLocaleString('tr-TR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }) +
    '%'
  );
}

export function fmtShares(n: number): string {
  return Math.round(n).toLocaleString('tr-TR');
}

export function levelLabel(level: 'safe' | 'warning' | 'danger'): string {
  return level === 'safe' ? 'Güvenli' : level === 'warning' ? 'Dikkat' : 'Tehlike';
}
