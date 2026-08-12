/**
 * Built-in free-response template library (Phase 5: Complex Targets).
 *
 * These are the "hidden targets" the user tries to describe from perception.
 * Each template has the target label plus the keywords the programmatic judge
 * uses to score a description. Bundled statically so Phase 5 works without a
 * prior DB seed.
 *
 * Categories mirror the spec's complex-target progression:
 *   - 'playing-cards' : standard deck short labels (front-loads Phase 5)
 *   - 'common-objects': everyday items
 *   - 'animals'       : high-contrast silhouettes
 */
import type { TemplateEntry } from '../../types';

function t(
  id: string,
  category: string,
  label: string,
  keywords: string[],
  aliases: string[] = [],
): TemplateEntry {
  return {
    id,
    profileId: 'builtin',
    category,
    label,
    keywords,
    weight: 1,
    aliases,
    isCustom: false,
    createdAt: 0,
  };
}

export const BUILTIN_TEMPLATES: readonly TemplateEntry[] = [
  // ---- Playing cards ----
  t('card-ah', 'playing-cards', 'Ace of Hearts', ['ace', 'hearts', 'heart', 'red'], ['a', 'heart']),
  t('card-as', 'playing-cards', 'Ace of Spades', ['ace', 'spades', 'spade', 'black'], ['a']),
  t('card-kd', 'playing-cards', 'King of Diamonds', ['king', 'diamonds', 'diamond', 'red'], ['k']),
  t('card-qc', 'playing-cards', 'Queen of Clubs', ['queen', 'clubs', 'club', 'black'], ['q']),
  t('card-jh', 'playing-cards', 'Jack of Hearts', ['jack', 'hearts', 'heart', 'red'], ['j']),
  t('card-10s', 'playing-cards', 'Ten of Spades', ['ten', 'spades', 'spade', 'black']),
  t('card-9d', 'playing-cards', 'Nine of Diamonds', ['nine', 'diamonds', 'diamond', 'red']),
  t('card-8c', 'playing-cards', 'Eight of Clubs', ['eight', 'clubs', 'club', 'black']),

  // ---- Common objects ----
  t('obj-apple', 'common-objects', 'Apple', ['apple'], ['fruit']),
  t('obj-key', 'common-objects', 'Key', ['key']),
  t('obj-cup', 'common-objects', 'Cup', ['cup', 'mug'], ['glass']),
  t('obj-star', 'common-objects', 'Star', ['star']),
  t('obj-ring', 'common-objects', 'Ring', ['ring', 'circle'], ['circle']),
  t('obj-book', 'common-objects', 'Book', ['book']),
  t('obj-ball', 'common-objects', 'Ball', ['ball', 'circle'], ['sphere']),
  t('obj-scissors', 'common-objects', 'Scissors', ['scissors'], ['scissor']),

  // ---- Animals ----
  t('an-cat', 'animals', 'Cat', ['cat'], ['kitten', 'feline']),
  t('an-dog', 'animals', 'Dog', ['dog'], ['puppy', 'canine']),
  t('an-bird', 'animals', 'Bird', ['bird', 'wings'], ['wing']),
  t('an-fish', 'animals', 'Fish', ['fish'], ['fin']),
  t('an-horse', 'animals', 'Horse', ['horse'], ['pony']),
  t('an-butterfly', 'animals', 'Butterfly', ['butterfly', 'wings'], ['moth']),
  t('an-snake', 'animals', 'Snake', ['snake'], ['serpent']),
  t('an-rabbit', 'animals', 'Rabbit', ['rabbit'], ['bunny', 'hare']),
];

/** All built-in categories, in the order the dashboard should present them. */
export const BUILTIN_CATEGORIES: readonly string[] = [
  'playing-cards',
  'common-objects',
  'animals',
];

/** Pick built-in templates for a given category. */
export function templatesForCategory(category: string): TemplateEntry[] {
  return BUILTIN_TEMPLATES.filter((t) => t.category === category);
}
