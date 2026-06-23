import { Body1, Title3, makeStyles, tokens } from '@fluentui/react-components';
import { DocumentSearchRegular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalM,
    minHeight: '240px',
    width: '100%',
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
  },
  icon: {
    width: '64px',
    height: '64px',
    borderRadius: tokens.borderRadiusCircular,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  message: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '480px',
  },
});

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Explicit empty state shown when a successful query returns no records. */
export function EmptyState({
  title = 'Nothing here yet',
  message = 'There are no records to display.',
  icon,
  action,
}: EmptyStateProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <span className={styles.icon} aria-hidden>
        {icon ?? <DocumentSearchRegular />}
      </span>
      <Title3>{title}</Title3>
      <Body1 className={styles.message}>{message}</Body1>
      {action}
    </div>
  );
}

export default EmptyState;
