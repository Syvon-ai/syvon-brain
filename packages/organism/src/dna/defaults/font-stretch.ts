/**
 * Font stretch (width) constants.
 * Maps OS/2 usWidthClass values to CSS font-stretch keywords.
 */

export type FontStretchKeyword =
  | 'ultra-condensed'
  | 'extra-condensed'
  | 'condensed'
  | 'semi-condensed'
  | 'normal'
  | 'semi-expanded'
  | 'expanded'
  | 'extra-expanded'
  | 'ultra-expanded';

export const WIDTH_CLASS_MAP: Record<number, FontStretchKeyword> = {
  1: 'ultra-condensed',
  2: 'extra-condensed',
  3: 'condensed',
  4: 'semi-condensed',
  5: 'normal',
  6: 'semi-expanded',
  7: 'expanded',
  8: 'extra-expanded',
  9: 'ultra-expanded',
};

export const DEFAULT_FONT_STRETCH: FontStretchKeyword = 'normal';
