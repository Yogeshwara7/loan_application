import { Caption1, Text, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import {
  CheckmarkFilled,
  CheckmarkCircleFilled,
  DismissCircleFilled,
  ClockFilled,
  DocumentFilled,
  CircleFilled,
  CircleRegular,
} from '@fluentui/react-icons';
import type { ReactElement } from 'react';
import { classifyStatus, formatRelative, type StatusKind } from '../../models/loan';
import type { LoanTimelineStep } from '../../services/LoanTimelineService';
import { StatusBadge } from '../StatusBadge';
import { getStepState } from './stepState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column' },
  item: { display: 'flex', gap: tokens.spacingHorizontalL },
  rail: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  dot: {
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusCircular,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
    zIndex: 1,
  },
  dotCompleted: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
  },
  dotPending: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    ...shorthands.border('2px', 'solid', tokens.colorNeutralStroke2),
  },
  dotApproved: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
    boxShadow: `0 0 0 4px color-mix(in srgb, ${tokens.colorPaletteGreenForeground1} 20%, transparent)`,
  },
  dotRejected: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
    boxShadow: `0 0 0 4px color-mix(in srgb, ${tokens.colorPaletteRedForeground1} 20%, transparent)`,
  },
  dotReview: {
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    color: tokens.colorPaletteMarigoldForeground1,
    boxShadow: `0 0 0 4px color-mix(in srgb, ${tokens.colorPaletteMarigoldForeground1} 20%, transparent)`,
  },
  dotBrand: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    boxShadow: `0 0 0 4px color-mix(in srgb, ${tokens.colorBrandForeground1} 20%, transparent)`,
  },
  line: {
    flexGrow: 1,
    width: '2px',
    minHeight: '20px',
    marginTop: tokens.spacingVerticalXXS,
    backgroundColor: tokens.colorNeutralStroke2,
  },
  lineCompleted: { backgroundColor: tokens.colorPaletteGreenBackground3 },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXL,
    minWidth: 0,
  },
  stepName: { fontWeight: tokens.fontWeightSemibold },
  pending: { color: tokens.colorNeutralForeground3 },
  timestamp: { color: tokens.colorNeutralForeground4 },
});

const currentIcon: Record<StatusKind, ReactElement> = {
  approved: <CheckmarkCircleFilled />,
  rejected: <DismissCircleFilled />,
  review: <ClockFilled />,
  received: <DocumentFilled />,
  other: <CircleFilled />,
};

export interface LoanTimelineProps {
  steps: readonly LoanTimelineStep[];
}

/** Vertical lifecycle timeline (Stripe/Linear style) built from Fluent primitives. */
export function LoanTimeline({ steps }: LoanTimelineProps) {
  const styles = useStyles();

  const currentDotClass: Record<StatusKind, string> = {
    approved: styles.dotApproved,
    rejected: styles.dotRejected,
    review: styles.dotReview,
    received: styles.dotBrand,
    other: styles.dotBrand,
  };

  return (
    <div className={styles.root} role="list" aria-label="Application lifecycle">
      {steps.map((step, index) => {
        const state = getStepState(step, index, steps.length);
        const category = classifyStatus(step.status);
        const isLast = index === steps.length - 1;

        const dotClass =
          state === 'completed'
            ? styles.dotCompleted
            : state === 'current'
              ? currentDotClass[category]
              : styles.dotPending;

        const icon =
          state === 'completed' ? (
            <CheckmarkFilled />
          ) : state === 'current' ? (
            currentIcon[category]
          ) : (
            <CircleRegular />
          );

        return (
          <div className={styles.item} key={`${step.step}-${index}`} role="listitem">
            <div className={styles.rail}>
              <span className={mergeClasses(styles.dot, dotClass)} aria-hidden>
                {icon}
              </span>
              {!isLast && (
                <span
                  className={
                    state === 'completed'
                      ? mergeClasses(styles.line, styles.lineCompleted)
                      : styles.line
                  }
                />
              )}
            </div>
            <div className={styles.body}>
              <Text className={styles.stepName}>{step.step}</Text>
              {state === 'current' ? (
                <StatusBadge label={step.status} size="small" />
              ) : (
                <Caption1 className={styles.pending}>
                  {state === 'completed' ? 'Completed' : 'Pending'}
                </Caption1>
              )}
              <Caption1 className={styles.timestamp}>
                {step.timestamp ? formatRelative(step.timestamp) : 'Timestamp pending'}
              </Caption1>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LoanTimeline;
