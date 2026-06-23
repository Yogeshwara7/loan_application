import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';

/**
 * Innorve brand ramp — a refined indigo that stays Microsoft-native (works with
 * the Fluent token system) while reading as a distinct finance product rather
 * than stock Power Apps blue. Shade 80 is the primary brand colour; lower
 * numbers are darker (hover/pressed), higher numbers lighter (tints/surfaces).
 */
export const innorveBrand: BrandVariants = {
  10: '#060814',
  20: '#111634',
  30: '#18204F',
  40: '#1E2A68',
  50: '#243380',
  60: '#2C3F9C',
  70: '#3A4FBE',
  80: '#4661D9',
  90: '#5E76E0',
  100: '#7589E6',
  110: '#8E9DEC',
  120: '#A8B4F1',
  130: '#C2CBF5',
  140: '#DBE0F9',
  150: '#ECEFFC',
  160: '#F6F7FE',
};

// Slightly softer corner rounding than Fluent's defaults for a more elevated,
// modern surface treatment across cards, inputs and buttons.
const rounding = {
  borderRadiusMedium: '6px',
  borderRadiusLarge: '10px',
  borderRadiusXLarge: '14px',
} satisfies Partial<Theme>;

export const innorveLightTheme: Theme = {
  ...createLightTheme(innorveBrand),
  ...rounding,
};

export const innorveDarkTheme: Theme = {
  ...createDarkTheme(innorveBrand),
  ...rounding,
};
