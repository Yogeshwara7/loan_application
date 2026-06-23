import { Spinner, makeStyles, tokens } from '@fluentui/react-components';

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
  },
});

export interface LoadingStateProps {
  label?: string;
}

/** Explicit loading state used across pages while async data is in flight. */
export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  const styles = useStyles();
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <Spinner size="large" label={label} />
    </div>
  );
}

export default LoadingState;
