export interface NavItem {
  href: string;
  label: string;
  icon: string;
  desc: string;
}

export const NAV: NavItem[] = [
  { href: '/', label: 'Genel Bakış', icon: 'dashboard', desc: 'Portföyün sağlık fotoğrafı' },
  { href: '/portfolio', label: 'Portföy', icon: 'briefcase', desc: 'Pozisyonlar ve teminat' },
  { href: '/simulator', label: 'Simülatör', icon: 'calculator', desc: 'Trade′i test et' },
  { href: '/scenarios', label: 'Senaryolar', icon: 'waypoints', desc: 'Stres testi' },
  { href: '/finder', label: 'Bulucu', icon: 'scan-search', desc: 'En iyi trade′i bul' },
  { href: '/education', label: 'Eğitim', icon: 'book', desc: 'Mantığı öğren' }
];
