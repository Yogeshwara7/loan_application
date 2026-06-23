import { useMemo } from 'react';
import { Button, Subtitle2, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowDownloadRegular } from '@fluentui/react-icons';
import { useLoanData } from '../context/LoanDataContext';
import {
  computeDashboardMetrics,
  formatCompactCurrency,
  loanTypeBreakdown,
  statusDistribution,
} from '../models/loan';
import { statusColorToken, seriesColorTokens } from '../statusColors';
import { downloadApplicationsCsv } from '../utils/export';
import { PageHeader } from '../components/PageHeader';
import { Surface } from '../components/Surface';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { DetailList } from '../components/DetailList';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  cardTitle: { marginBottom: tokens.spacingVerticalM },
});

export function Analytics() {
  const styles = useStyles();
  const { records, status, reload } = useLoanData();

  const metrics = useMemo(() => computeDashboardMetrics(records), [records]);
  const donutData = useMemo(
    () => statusDistribution(records).map((s) => ({ ...s, color: statusColorToken[s.kind] })),
    [records],
  );
  const barData = useMemo(
    () =>
      loanTypeBreakdown(records).map((b, i) => ({
        ...b,
        color: seriesColorTokens[i % seriesColorTokens.length]!,
      })),
    [records],
  );

  return (
    <div className={styles.root}>
      <PageHeader
        title="Analytics"
        subtitle="Portfolio insights across all loan applications."
        actions={
          <Button
            icon={<ArrowDownloadRegular />}
            onClick={() => downloadApplicationsCsv(records)}
            disabled={records.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      {status === 'loading' && <LoadingSkeleton variant="cards" count={3} />}

      {status === 'error' && (
        <Surface padded={false}>
          <ErrorState title="Couldn't load analytics" onRetry={() => void reload()} />
        </Surface>
      )}

      {status === 'ready' && records.length === 0 && (
        <Surface padded={false}>
          <EmptyState title="No data to analyze" message="Analytics will appear once applications exist." />
        </Surface>
      )}

      {status === 'ready' && records.length > 0 && (
        <>
          <div className={styles.twoCol}>
            <Surface>
              <Subtitle2 className={styles.cardTitle}>Loan Status Distribution</Subtitle2>
              <DonutChart data={donutData} centerValue={metrics.total} centerLabel="Total" />
            </Surface>
            <Surface>
              <Subtitle2 className={styles.cardTitle}>Loan Type Breakdown</Subtitle2>
              <BarChart data={barData} />
            </Surface>
          </div>

          <div className={styles.twoCol}>
            <Surface>
              <Subtitle2 className={styles.cardTitle}>Portfolio Summary</Subtitle2>
              <DetailList
                items={[
                  { label: 'Total applications', value: metrics.total },
                  { label: 'Approved', value: metrics.approved },
                  { label: 'Rejected', value: metrics.rejected },
                  { label: 'Under review', value: metrics.review },
                  { label: 'Received', value: metrics.received },
                  { label: 'Approval rate', value: `${metrics.approvalRate}%` },
                  { label: 'Total loan value', value: formatCompactCurrency(metrics.totalValue) },
                ]}
              />
            </Surface>
            <Surface>
              <Subtitle2 className={styles.cardTitle}>Loan Type Detail</Subtitle2>
              <DetailList
                items={loanTypeBreakdown(records).map((b) => ({ label: b.label, value: b.value }))}
              />
            </Surface>
          </div>
        </>
      )}
    </div>
  );
}

export default Analytics;
