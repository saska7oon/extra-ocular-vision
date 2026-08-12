/**
 * Built-in spatial/environmental templates (Phase 6: Environmental Mapping).
 *
 * SAFETY: Phase 6 is a SEATED perception exercise only. There is NO navigation,
 * NO path tracking, NO walking, and NO location/GPS data anywhere in this phase.
 * The user perceives a presented spatial layout (a virtual room arrangement)
 * and describes the positions/objects from perception. This keeps the phase
 * purely perceptual and avoids the serious safety risks of practicing
 * "environmental mapping" while moving while blindfolded.
 *
 * Each template describes a layout cell: a position (left/center/right,
 * near/mid/far) plus an object. The programmatic judge (features/judging)
 * scores how well the user's spatial description matches.
 */
import type { TemplateEntry } from '../../types';

function t(
  id: string,
  label: string,
  keywords: string[],
  aliases: string[] = [],
): TemplateEntry {
  return {
    id,
    profileId: 'builtin',
    category: 'environmental-mapping',
    label,
    keywords,
    weight: 1,
    aliases,
    isCustom: false,
    createdAt: 0,
  };
}

/**
 * A "room" template: one distinct layout the user perceives. Each is a
 * combination of a side and a distance plus an object, e.g. "Chair on the left,
 * close". The judge scores the described arrangement against these facets.
 */
export const ENV_TEMPLATES: readonly TemplateEntry[] = [
  // ---- Single object positions ----
  t('env-obj-left-near', 'Object on the left, close', ['left', 'close', 'near'], ['left side']),
  t('env-obj-right-far', 'Object on the right, far', ['right', 'far'], ['right side']),
  t('env-obj-center', 'Object directly in front', ['center', 'front', 'middle'], ['centre', 'ahead']),
  t('env-obj-left-far', 'Object on the far left', ['left', 'far'], ['far left']),
  t('env-obj-right-near', 'Object on the near right', ['right', 'near', 'close'], ['near right']),

  // ---- Two-object arrangements ----
  t('env-two-sides', 'Two objects, one each side', ['two', 'left', 'right', 'sides'], ['both sides', 'either side']),
  t('env-two-near', 'Two objects close together', ['two', 'close', 'near', 'together'], ['pair', 'both']),
  t('env-two-aligned', 'Two objects in a line', ['two', 'line', 'aligned', 'row'], ['in a row']),

  // ---- Room-flavor descriptors ----
  t('env-open', 'Open, empty floor', ['open', 'empty', 'clear'], ['spacious']),
  t('env-cluttered', 'Cluttered / many objects', ['cluttered', 'many', 'objects'], ['crowded', 'lots']),
  t('env-corner', 'Objects gathered in a corner', ['corner', 'gathered'], ['in the corner']),
  t('env-wall-distant', 'A wall perceived at distance', ['wall', 'distant'], ['far wall']),
];
