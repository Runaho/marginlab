import { writable } from 'svelte/store';
import { getConcept, type Concept } from '../engine/concepts';

export const conceptStore = writable<{ open: boolean; concept: Concept | null }>({
  open: false,
  concept: null
});

export function openConcept(key: string) {
  conceptStore.set({ open: true, concept: getConcept(key) ?? null });
}

export function closeConcept() {
  conceptStore.update((s) => ({ ...s, open: false }));
}
