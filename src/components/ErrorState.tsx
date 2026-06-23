import {
  Body1,
  Button,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ErrorCircleRegular, ArrowClockwiseRegular } from '@fluentui/react-icons';

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
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
  },
  message: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '480px',
  },
});

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Explicit error state with an optional retry action. */
export function ErrorState({
  title = 'Unable to load data',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  const styles = useStyles();
  return (
    <div className={styles.root} role="alert">
      <span className={styles.icon} aria-hidden>
        <ErrorCircleRegular />
      </span>
      <Title3>{title}</Title3>
      <Body1 className={styles.message}>{message}</Body1>
      {onRetry && (
        <Button appearance="primary" icon={<ArrowClockwiseRegular />} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
