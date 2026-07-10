import { browser } from '$app/environment';
import { seedSettings } from './defaults';
import { createLocalSettingsRepository } from './repository';
import { validateSettings, type ValidationIssue } from './validate';
import type { BrokerProfileId } from '../marginProfile';
import type { Settings } from './types';

const repo = createLocalSettingsRepository();

function initial(): Settings {
  if (browser) return repo.loadMigrated();
  return seedSettings();
}

export const settings = $state<Settings>(initial());

/**
 * Tek kaynak: aktif profil kimliği.
 * UI/selector'lar bunu kullanmalı; app.profile'a yazma yapılmamalı.
 */
export function getActiveProfileId(): BrokerProfileId {
  return (settings as Settings).activeProfileId;
}

export function getSettings(): Settings {
  return settings as Settings;
}

export function updateSettings(mutator: (s: Settings) => void): void {
  mutator(settings as Settings);
  settings.dataSource.lastUpdated = new Date().toISOString();
  if (browser) repo.save(settings as Settings);
}

export function setActiveProfile(id: BrokerProfileId): void {
  updateSettings((s) => {
    s.activeProfileId = id;
  });
}

export function validationIssues(): ValidationIssue[] {
  return validateSettings(settings as Settings);
}

export function hasBlockingIssues(): boolean {
  return validationIssues().some((i) => i.level === 'error');
}

export function resetSettings(): void {
  const fresh = repo.reset();
  Object.assign(settings, fresh);
}

export function restoreDemoSettings(): void {
  const fresh = seedSettings();
  Object.assign(settings, fresh);
  if (browser) repo.save(settings as Settings);
}
