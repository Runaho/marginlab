import { t } from './index';
import type { CostBreakdown } from '$lib/engine/types';
import type { CollateralSource, BrokerProfileId } from '$lib/engine/marginProfile';
import type { Sector } from '$lib/engine/types';

const COST_KEY: Record<keyof CostBreakdown, string> = {
	openCommission: 'costOpenCommission',
	closeCommission: 'costCloseCommission',
	spread: 'costSpread',
	secFee: 'costSecFee',
	custody: 'costCustody',
	interest: 'costInterest',
	total: 'costTotal'
};

export function costLabel(k: keyof CostBreakdown): string {
	return t(COST_KEY[k]);
}

export function collateralSourceLabel(source: CollateralSource, rate: number): string {
	switch (source) {
		case 'broker-data':
			return t('collSourceBroker');
		case 'default-assumption':
			return t('collSourceDefault', { rate: Math.round(rate * 100) });
		case 'user-override':
			return t('collSourceUser');
		case 'unavailable':
			return t('collSourceUnavailable');
		case 'unknown':
			return t('collSourceUnknown');
	}
}

const SCENARIO_KEY: Record<string, string> = {
	Bull: 'scenarioBull',
	Hype: 'scenarioHype',
	'Low Dip': 'scenarioLowDip',
	Peak: 'scenarioPeak',
	'Slow Bleed': 'scenarioSlowBleed',
	'Credit Stress': 'scenarioCreditStress',
	'Tech Selloff': 'scenarioTechSelloff',
	Recovery: 'scenarioRecovery',
	Flat: 'scenarioFlat'
};

export function scenarioLabel(name: string): string {
	return t(SCENARIO_KEY[name] ?? name);
}

export function scenarioDesc(name: string): string {
	return t(`${SCENARIO_KEY[name] ?? name}Desc`);
}

const PROFILE_KEY: Record<BrokerProfileId, string> = {
	general: 'profileGeneral',
	'cash-first': 'profileCashFirst',
	conservative: 'profileConservative'
};
const PROFILE_SHORT: Record<BrokerProfileId, string> = {
	general: 'profileGeneralShort',
	'cash-first': 'profileCashFirstShort',
	conservative: 'profileConservativeShort'
};
const PROFILE_DESC: Record<BrokerProfileId, string> = {
	general: 'profileGeneralDesc',
	'cash-first': 'profileCashFirstDesc',
	conservative: 'profileConservativeDesc'
};

export function profileLabel(id: BrokerProfileId): string {
	return t(PROFILE_KEY[id]);
}
export function profileShort(id: BrokerProfileId): string {
	return t(PROFILE_SHORT[id]);
}
export function profileDesc(id: BrokerProfileId): string {
	return t(PROFILE_DESC[id]);
}

const SECTOR_KEY: Record<string, string> = {
	'Teknoloji': 'sectorTeknoloji',
	'Finans': 'sectorFinans',
	'Enerji': 'sectorEnerji',
	'Sağlık': 'sectorSaglik',
	'Tüketim': 'sectorTuketim',
	'Endüstriyel': 'sectorEndustriyel',
	'İletişim': 'sectorIletisim',
	'Diğer': 'sectorDiger'
};

export function sectorLabel(s: Sector | string): string {
	return t(SECTOR_KEY[s as string] ?? 'sectorDiger');
}

export function marginDisclaimer(): string {
	return t('marginDisclaimer');
}

const CONCEPT_KEY: Record<string, string> = {
	initial: 'conceptInitial',
	maintenance: 'conceptMaintenance',
	callprice: 'conceptCallprice',
	buffer: 'conceptBuffer',
	collateral: 'conceptCollateral',
	concentration: 'conceptConcentration',
	carry: 'conceptCarry',
	scenario: 'conceptScenario'
};

export function conceptTitle(key: string): string {
	return t(CONCEPT_KEY[key] ?? key);
}
export function conceptBody(key: string): string {
	return t(`${CONCEPT_KEY[key] ?? key}Body`);
}
export function conceptExample(key: string): string {
	return t(`${CONCEPT_KEY[key] ?? key}Example`);
}

export function levelLabelLocalized(level: 'safe' | 'warning' | 'danger'): string {
	return t(level === 'safe' ? 'levelSafe' : level === 'warning' ? 'levelWarning' : 'levelDanger');
}

import type { RiskStatus } from '$lib/engine/account/riskThresholdEngine';

const RISK_STATUS_KEY: Record<RiskStatus, string> = {
	controlled: 'riskStatusControlled',
	'early-warning': 'riskStatusEarlyWarning',
	'maintenance-risk': 'riskStatusMaintenanceRisk',
	'margin-call': 'riskStatusMarginCall'
};

export function riskStatusLabel(s: RiskStatus | 'unknown'): string {
	if (s === 'unknown') return t('riskStatusUnknown');
	return t(RISK_STATUS_KEY[s]);
}

import type { RecommendationKey } from '$lib/engine/account/riskThresholdEngine';

export function recommendedActionLabel(rec: RecommendationKey): string {
	return t(rec.key);
}
