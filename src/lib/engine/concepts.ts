export interface Concept {
  key: string;
  title: string;
  body: string;
  example: string;
}

import concepts from '../data/concepts.json';
import { conceptTitle, conceptBody, conceptExample } from '$lib/i18n/labels';

export const CONCEPTS: Concept[] = (concepts as Concept[]).map((c) => ({
  key: c.key,
  title: conceptTitle(c.key),
  body: conceptBody(c.key),
  example: conceptExample(c.key)
}));

export function getConcept(key: string): Concept | undefined {
  return CONCEPTS.find((c) => c.key === key);
}
