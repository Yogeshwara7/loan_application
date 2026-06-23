import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Cr174_loanapplicsService } from '../generated';
import type { LoanApplication } from '../models/loan';
import { toErrorMessage } from '../models/loan';

export type LoanDataStatus = 'loading' | 'error' | 'ready';

interface LoanDataContextValue {
  status: LoanDataStatus;
  records: LoanApplication[];
  error: string;
  /** Re-fetch all applications from Dataverse. */
  reload: () => Promise<void>;
}

const LoanDataContext = createContext<LoanDataContextValue | undefined>(undefined);

/**
 * Single source of truth for loan applications. Fetches once and is shared by
 * the dashboard, applications grid, details page and analytics so they stay in
 * sync and avoid duplicate Dataverse round-trips. Still backed entirely by the
 * existing Cr174_loanapplicsService.
 */
export function LoanDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoanDataStatus>('loading');
  const [records, setRecords] = useState<LoanApplication[]>([]);
  const [error, setError] = useState<string>('');

  const reload = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const result = await Cr174_loanapplicsService.getAll({
        orderBy: ['cr174_createddate desc'],
      });
      if (!result.success) {
        throw result.error ?? new Error('The service returned an unsuccessful response.');
      }
      setRecords(result.data ?? []);
      setStatus('ready');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load loan applications from Dataverse.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // Intentional one-time fetch on mount; `reload` manages its own state machine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({ status, records, error, reload }),
    [status, records, error, reload],
  );

  return <LoanDataContext.Provider value={value}>{children}</LoanDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLoanData(): LoanDataContextValue {
  const ctx = useContext(LoanDataContext);
  if (!ctx) {
    throw new Error('useLoanData must be used within a LoanDataProvider.');
  }
  return ctx;
}
