import { Body1, Caption1, Text, makeStyles, tokens } from '@fluentui/react-components';
import {
  CheckmarkCircleFilled,
  DismissCircleFilled,
  ClockFilled,
  DocumentFilled,
} from '@fluentui/react-icons';
import type { ReactElement } from 'react';
import { classifyStatus, formatRelative, type ActivityItem, type StatusKind } from '../models/loan';
import { statusColorToken } from '../statusColors';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    position: 'relative',
    paddingBottom: tokens.spacingVerticalL,
  },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  dot: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusCircular,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    backgroundColor: tokens.colorNeutralBackground3,
    zIndex: 1,
  },
  line: {
    flexGrow: 1,
    width: '2px',
    backgroundColor: tokens.colorNeutralStroke2,
    marginTop: tokens.spacingVerticalXXS,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  headline: {
    fontWeight: tokens.fontWeightSemibold,
  },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
});

const iconByKind: Record<StatusKind, ReactElement> = {
  approved: <CheckmarkCircleFilled />,
  rejected: <DismissCircleFilled />,
  review: <ClockFilled />,
  received: <DocumentFilled />,
  other: <DocumentFilled />,
};

function eventText(kind: StatusKind): string {
  switch (kind) {
    case 'approved':
      return 'Application approved';
    case 'rejected':
      return 'Application rejected';
    case 'review':
      return 'Moved to review';
    default:
      return 'Application submitted';
  }
}

export interface ActivityTimelineProps {
  items: readonly ActivityItem[];
  /** Hide the connecting line on the last item. Default true. */
  trimLastLine?: boolean;
}

/** Vertical activity timeline derived from real application records. */
export function ActivityTimeline({ items, trimLastLine = true }: ActivityTimelineProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      {items.map((item, index) => {
        const kind = classifyStatus(item.statusLabel);
        const isLast = index === items.length - 1;
        return (
          <div key={item.id || index} className={styles.item}>
            <div className={styles.rail}>
              <span
                className={styles.dot}
                style={{ color: statusColorToken[kind] }}
                aria-hidden
              >
                {iconByKind[kind]}
              </span>
              {!(isLast && trimLastLine) && <span className={styles.line} />}
            </div>
            <div className={styles.body}>
              <Body1 className={styles.headline}>{eventText(kind)}</Body1>
              <Text size={300}>
                {item.reference} · {item.applicant}
              </Text>
              <Caption1 className={styles.meta}>{formatRelative(item.date)}</Caption1>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ActivityTimeline;
