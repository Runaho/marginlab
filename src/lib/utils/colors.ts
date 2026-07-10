import type { Sector } from '../engine/types';

export const SECTOR_COLORS: Record<Sector, string> = {
  Teknoloji: '#3a6ea5',
  Finans: '#2f6b3b',
  Enerji: '#9a5b13',
  Sağlık: '#7a4f9c',
  Tüketim: '#1f7a7a',
  Endüstriyel: '#8e2437',
  İletişim: '#4a6b8a',
  Diğer: '#6e685f'
};

export function levelColor(level: 'safe' | 'warning' | 'danger'): string {
  return level === 'safe'
    ? 'var(--success)'
    : level === 'warning'
      ? 'var(--warning)'
      : 'var(--danger)';
}
