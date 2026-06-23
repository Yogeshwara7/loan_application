import { Caption1, Title1, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
  ArrowTrendingRegular,
  ArrowUpRightRegular,
  ArrowDownRightRegular,
  SubtractRegular,
} from '@fluentui/react-icons';
import type { ReactElement, ReactNode } from 'react';
import { Surface } from './Surface';

export type KpiTone = 'brand' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'orange';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minHeight: '136px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  chip: {
    width: '44px',
    height: '44px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  chipBrand: { backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
  chipSuccess: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
  },
  chipDanger: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
  },
  chipWarning: {
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    color: tokens.colorPaletteMarigoldForeground2,
  },
  chipInfo: {
    backgroundColor: tokens.colorPaletteTealBackground2,
    color: tokens.colorPaletteTealForeground2,
  },
  chipOrange: {
    backgroundColor: tokens.colorPaletteDarkOrangeBackground2,
    color: tokens.colorPaletteDarkOrangeForeground2,
  },
  chipNeutral: {
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground2,
  },
  trend: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    paddingInline: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalXXS,
    borderRadius: tokens.borderRadiusCircular,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  trendUp: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
  },
  trendDown: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
  },
  trendFlat: {
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground2,
  },
  metric: {
    lineHeight: '1',
  },
  labelBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  label: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  secondary: {
    color: tokens.colorNeutralForeground3,
  },
});

const chipClassByTone: Record<KpiTone, keyof ReturnType<typeof useStyles>> = {
  brand: 'chipBrand',
  success: 'chipSuccess',
  danger: 'chipDanger',
  warning: 'chipWarning',
  info: 'chipInfo',
  neutral: 'chipNeutral',
  orange: 'chipOrange',
};

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon: ReactElement;
  tone: KpiTone;
  /** Percentage change vs last week; null = no baseline ("New"), undefined = hide. */
  deltaPct?: number | null;
  /** When true, an upward trend is shown as negative (e.g. rejections). */
  invertTrend?: boolean;
  secondary?: string;
}

function TrendPill({ deltaPct, invert }: { deltaPct: number | null; invert: boolean }) {
  const styles = useStyles();
  if (deltaPct === null) {
    return (
      <span className={mergeClasses(styles.trend, styles.trendFlat)}>
        <ArrowTrendingRegular />
        New
      </span>
    );
  }
  const positive = invert ? deltaPct < 0 : deltaPct > 0;
  const negative = invert ? deltaPct > 0 : deltaPct < 0;
  const toneClass = positive ? styles.trendUp : negative ? styles.trendDown : styles.trendFlat;
  const Icon = deltaPct > 0 ? ArrowUpRightRegular : deltaPct < 0 ? ArrowDownRightRegular : SubtractRegular;
  const sign = deltaPct > 0 ? '+' : '';
  return (
    <span className={mergeClasses(styles.trend, toneClass)}>
      <Icon />
      {sign}
      {deltaPct}% vs last week
    </span>
  );
}

/** Reusable KPI metric card with icon chip, large value, trend pill and insight. */
export function KpiCard({ label, value, icon, tone, deltaPct, invertTrend = false, secondary }: KpiCardProps) {
  const styles = useStyles();
  return (
    <Surface interactive className={styles.card}>
      <div className={styles.topRow}>
        <span className={mergeClasses(styles.chip, styles[chipClassByTone[tone]])} aria-hidden>
          {icon}
        </span>
        {deltaPct !== undefined && <TrendPill deltaPct={deltaPct} invert={invertTrend} />}
      </div>
      <Title1 className={styles.metric}>{value}</Title1>
      <div className={styles.labelBlock}>
        <Caption1 className={styles.label}>{label}</Caption1>
        {secondary && <Caption1 className={styles.secondary}>{secondary}</Caption1>}
      </div>
    </Surface>
  );
}

export default KpiCard;
