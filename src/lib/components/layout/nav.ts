import { t as _t } from '$lib/i18n';
const t = _t as unknown as (key: string, params?: Record<string, unknown>) => string;

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  desc: string;
  step: number;
  stage: string;
}

export const NAV: NavItem[] = [
  { href: '/', label: t('navGeneral'), icon: 'dashboard', desc: t('navGeneralDesc'), step: 1, stage: t('navGeneralStage') },
  { href: '/portfolio', label: t('navPortfolio'), icon: 'briefcase', desc: t('navPortfolioDesc'), step: 2, stage: t('navPortfolioStage') },
  { href: '/simulator', label: t('navSimulator'), icon: 'calculator', desc: t('navSimulatorDesc'), step: 3, stage: t('navSimulatorStage') },
  { href: '/scenarios', label: t('navScenarios'), icon: 'waypoints', desc: t('navScenariosDesc'), step: 4, stage: t('navScenariosStage') },
  { href: '/settings', label: t('navSettings'), icon: 'sliders', desc: t('navSettingsDesc'), step: 8, stage: t('navSettingsStage') },
  { href: '/finder', label: t('navFinder'), icon: 'scan-search', desc: t('navFinderDesc'), step: 5, stage: t('navFinderStage') },
  { href: '/education', label: t('navEducation'), icon: 'book', desc: t('navEducationDesc'), step: 6, stage: t('navEducationStage') }
];
