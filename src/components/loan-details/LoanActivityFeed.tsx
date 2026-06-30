import { Caption1, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
  CheckmarkCircleFilled,
  DismissCircleFilled,
  ClockFilled,
  DocumentFilled,
  CircleFilled,
  ArrowSyncFilled,
} from '@fluentui/react-icons';
import type { ReactElement } from 'react';
import { classifyStatus, formatRelative, type StatusKind } from '../../models/loan';
import type { LoanTimelineStep } from '../../services/LoanTimelineService';
import { getStepState } from './stepState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  row: { display: 'flex', alignItems: 'flex-start', gap: tokens.spacingHorizontalM },
  dot: {
    width: '30px',
    height: '30px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  dotGreen: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
  },
  dotRed: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
  },
  dotAmber: {
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    color: tokens.colorPaletteMarigoldForeground1,
  },
  dotBrand: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  dotOrange: {
    backgroundColor: tokens.colorPaletteDarkOrangeBackground2,
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, minWidth: 0 },
  headline: { fontWeight: tokens.fontWeightSemibold },
  time: { color: tokens.colorNeutralForeground4 },
});

const categoryIcon: Record<StatusKind, ReactElement> = {
  approved: <CheckmarkCircleFilled />,
  rejected: <DismissCircleFilled />,
  review: <ClockFilled />,
  received: <DocumentFilled />,
  resubmitted: <ArrowSyncFilled />,
  other: <CircleFilled />,
};

function describe(step: LoanTimelineStep): string {
  const name = step.step.toLowerCase();
  // Keep the flow's own wording for resubmission events (checked before "submit").
  if (name.includes('resubmit') || name.includes('re-submit')) return step.step;
  if (name.includes('submit')) return 'Application was submitted';
  if (name.includes('receiv')) return 'Application was received';
  if (name.includes('current')) return `Current status: ${step.status || 'Updated'}`;
  return step.step;
}

export interface LoanActivityFeedProps {
  steps: readonly LoanTimelineStep[];
}

/** Activity feed generated from the timeline data (newest first). */
export function LoanActivityFeed({ steps }: LoanActivityFeedProps) {
  const styles = useStyles();

  const dotClassByCategory: Record<StatusKind, string> = {
    approved: styles.dotGreen,
    rejected: styles.dotRed,
    review: styles.dotAmber,
    received: styles.dotBrand,
    resubmitted: styles.dotOrange,
    other: styles.dotBrand,
  };

  // Newest first for a feed reading order.
  const items = steps.map((step, index) => ({ step, index })).reverse();

  return (
    <div className={styles.root}>
      {items.map(({ step, index }) => {
        const state = getStepState(step, index, steps.length);
        const category = classifyStatus(step.status);
        const dotClass =
          state === 'completed'
            ? styles.dotGreen
            : state === 'current'
              ? dotClassByCategory[category]
              : styles.dot;
        const icon = state === 'completed' ? <CheckmarkCircleFilled /> : categoryIcon[category];

        return (
          <div className={styles.row} key={`${step.step}-${index}`}>
            <span className={mergeClasses(styles.dot, dotClass)} aria-hidden>
              {icon}
            </span>
            <div className={styles.body}>
              <Text className={styles.headline}>{describe(step)}</Text>
              {step.timestamp && (
                <Caption1 className={styles.time}>{formatRelative(step.timestamp)}</Caption1>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LoanActivityFeed;
