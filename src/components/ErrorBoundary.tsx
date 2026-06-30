import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Body1, Button, Caption1, Title3, makeStyles, tokens } from '@fluentui/react-components';
import { ErrorCircleRegular, ArrowClockwiseRegular, HomeRegular } from '@fluentui/react-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { Surface } from './Surface';

/**
 * Single place to report unhandled render errors. Currently logs to the console
 * (captured by the Power Apps host); replace the body with Application Insights
 * (`appInsights.trackException({ exception, properties })`) or another logging
 * service without touching the boundary itself.
 */
function reportError(error: Error, componentStack: string | null | undefined): void {
  console.error('[ErrorBoundary] Unhandled render error:', error);
  if (componentStack) {
    console.error('[ErrorBoundary] Component stack:', componentStack);
  }
}

// ---- Fallback UI (Fluent UI v9 only) ---------------------------------------

const useFallbackStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalM,
    textAlign: 'center',
    minHeight: '320px',
    paddingBlock: tokens.spacingVerticalXXL,
    paddingInline: tokens.spacingHorizontalL,
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
  message: { color: tokens.colorNeutralForeground2, maxWidth: '460px' },
  detail: { color: tokens.colorNeutralForeground3, maxWidth: '460px', wordBreak: 'break-word' },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: tokens.spacingVerticalS,
  },
});

interface ErrorFallbackProps {
  error: Error;
  onTryAgain: () => void;
  onGoToDashboard: () => void;
}

function ErrorFallback({ error, onTryAgain, onGoToDashboard }: ErrorFallbackProps) {
  const styles = useFallbackStyles();
  return (
    <Surface padded={false} role="alert">
      <div className={styles.root}>
        <span className={styles.icon} aria-hidden>
          <ErrorCircleRegular />
        </span>
        <Title3>Something went wrong</Title3>
        <Body1 className={styles.message}>
          An unexpected error occurred while rendering this page. You can try again, or return to
          the dashboard.
        </Body1>
        {error.message && <Caption1 className={styles.detail}>{error.message}</Caption1>}
        <div className={styles.actions}>
          <Button appearance="primary" icon={<ArrowClockwiseRegular />} onClick={onTryAgain}>
            Try Again
          </Button>
          <Button appearance="secondary" icon={<HomeRegular />} onClick={onGoToDashboard}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </Surface>
  );
}

// ---- Class boundary (catches render errors) --------------------------------

interface ErrorBoundaryInnerProps {
  children: ReactNode;
  /** Navigate to the dashboard — injected from the router-aware wrapper. */
  onGoToDashboard: () => void;
  /** Changes on route change; a caught error is auto-cleared when it changes. */
  resetKey: string;
}

interface ErrorBoundaryInnerState {
  error: Error | null;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryInnerProps, ErrorBoundaryInnerState> {
  state: ErrorBoundaryInnerState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryInnerState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryInnerProps): void {
    // If the user navigates to a different route while the fallback is showing,
    // clear the error so the new page renders normally. This only runs while an
    // error is active, so normal navigation is unaffected.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  private readonly handleGoToDashboard = (): void => {
    this.props.onGoToDashboard();
    this.reset();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <ErrorFallback
          error={error}
          onTryAgain={this.reset}
          onGoToDashboard={this.handleGoToDashboard}
        />
      );
    }
    return this.props.children;
  }
}

// ---- Router-aware wrapper (public API) -------------------------------------

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Where the "Go to Dashboard" button navigates. Defaults to the admin home. */
  homePath?: string;
}

/**
 * Reusable error boundary for the routed content. The actual catching is done by
 * the class component (the only React API that can); this wrapper injects router
 * navigation so the fallback can return home and so a caught error clears
 * automatically when the route changes.
 */
export function ErrorBoundary({ children, homePath = '/admin/dashboard' }: ErrorBoundaryProps) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <ErrorBoundaryInner
      onGoToDashboard={() => navigate(homePath)}
      resetKey={location.pathname}
    >
      {children}
    </ErrorBoundaryInner>
  );
}

export default ErrorBoundary;
