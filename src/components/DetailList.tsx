import { Body1, makeStyles, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalSNudge,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  lastRow: {
    borderBottom: 'none',
  },
  label: {
    color: tokens.colorNeutralForeground3,
  },
  value: {
    fontWeight: tokens.fontWeightSemibold,
    wordBreak: 'break-word',
    textAlign: 'right',
  },
});

export interface DetailListItem {
  label: string;
  value: ReactNode;
}

export interface DetailListProps {
  items: readonly DetailListItem[];
}

/** Reusable label/value list used in details, profile and review surfaces. */
export function DetailList({ items }: DetailListProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={index === items.length - 1 ? `${styles.row} ${styles.lastRow}` : styles.row}
        >
          <Body1 className={styles.label}>{item.label}</Body1>
          <Body1 className={styles.value}>{item.value}</Body1>
        </div>
      ))}
    </div>
  );
}

export default DetailList;
