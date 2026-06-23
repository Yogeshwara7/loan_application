import { tokens } from '@fluentui/react-components';
import type { StatusKind } from './models/loan';

/**
 * Status → colour token map shared by charts, badges and timeline dots so the
 * colour language stays consistent across the app. Token values are static CSS
 * variable references, safe to read at module load.
 */
export const statusColorToken: Record<StatusKind, string> = {
  approved: tokens.colorPaletteGreenForeground1,
  rejected: tokens.colorPaletteRedForeground1,
  review: tokens.colorPaletteMarigoldForeground1,
  received: tokens.colorBrandForeground1,
  other: tokens.colorNeutralForeground3,
};

/** A small ordered palette for the loan-type bar chart. */
export const seriesColorTokens: readonly string[] = [
  tokens.colorBrandForeground1,
  tokens.colorPaletteGreenForeground1,
  tokens.colorPaletteMarigoldForeground1,
  tokens.colorPalettePurpleForeground2,
  tokens.colorPaletteTealForeground2,
  tokens.colorPaletteBerryForeground1,
];
