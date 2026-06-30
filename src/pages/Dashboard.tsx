import { useMemo } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Subtitle1,
  Subtitle2,
  Text,
  Title1,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowDownloadRegular,
  ArrowSyncRegular,
  ClipboardTaskListLtrRegular,
  CheckmarkCircleRegular,
  ChevronRightRegular,
  ClockRegular,
  DataTrendingRegular,
  DismissCircleRegular,
  DocumentBulletListRegular,
  MoneyRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useLoanData } from '../context/LoanDataContext';
import { useCurrentUser, firstName } from '../context/UserContext';
import {
  classifyStatus,
  computeDashboardMetrics,
  deriveActivity,
  formatCompactCurrency,
  formatCurrency,
  formatRelative,
  loanTypeBreakdown,
  statusDistribution,
  weekOverWeek,
} from '../models/loan';
import { statusColorToken, seriesColorTokens } from '../statusColors';
import { downloadApplicationsCsv } from '../utils/export';
import { Surface } from '../components/Surface';
import { KpiCard } from '../components/KpiCard';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXL,
  },
  hero: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXXL,
    overflow: 'hidden',
    backgroundImage: `linear-gradient(120deg, ${tokens.colorBrandBackground} 0%, ${tokens.colorBrandBackgroundPressed} 100%)`,
    color: tokens.colorNeutralForegroundOnBrand,
    border: 'none',
  },
  heroText: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    minWidth: 0,
  },
  onBrand: { color: tokens.colorNeutralForegroundOnBrand },
  onBrandMuted: { color: tokens.colorNeutralForegroundOnBrand, opacity: 0.9 },
  heroStats: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    flexWrap: 'wrap',
    marginTop: tokens.spacingVerticalS,
  },
  heroStat: {
    display: 'flex',
    flexDirection: 'column',
  },
  heroActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  cardTitle: {
    marginBottom: tokens.spacingVerticalM,
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    transitionDuration: tokens.durationFaster,
    transitionProperty: 'background-color',
    ':hover': { backgroundColor: tokens.colorNeutralBackground2Hover },
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '-2px',
    },
  },
  recentMain: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  recentMeta: { color: tokens.colorNeutralForeground3 },
  recentRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexShrink: 0,
  },
  amount: { fontWeight: tokens.fontWeightSemibold },
  chevron: { color: tokens.colorNeutralForeground3, fontSize: '20px', flexShrink: 0 },
  viewAll: { marginTop: tokens.spacingVerticalM },
});

function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { records, status, reload } = useLoanData();
  const { user } = useCurrentUser();

  const metrics = useMemo(() => computeDashboardMetrics(records), [records]);
  const decided = metrics.approved + metrics.rejected;
  const pctOfTotal = (n: number) => (metrics.total === 0 ? 0 : Math.round((n / metrics.total) * 100));
  const trends = useMemo(
    () => ({
      total: weekOverWeek(records),
      approved: weekOverWeek(records, (r) => classifyStatus(r._cr174_status_label) === 'approved'),
      rejected: weekOverWeek(records, (r) => classifyStatus(r._cr174_status_label) === 'rejected'),
      review: weekOverWeek(records, (r) => classifyStatus(r._cr174_status_label) === 'review'),
      resubmitted: weekOverWeek(
        records,
        (r) => classifyStatus(r._cr174_status_label) === 'resubmitted',
      ),
    }),
    [records],
  );
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
  const activity = useMemo(() => deriveActivity(records, 7), [records]);
  const recent = useMemo(() => records.slice(0, 5), [records]);

  const hero = (
    <Surface className={styles.hero}>
      <div className={styles.heroText}>
        <Caption1 className={styles.onBrandMuted}>{greeting()},</Caption1>
        <Title1 className={styles.onBrand}>{firstName(user.fullName)}</Title1>
        <Body1 className={styles.onBrandMuted}>Loan operations overview</Body1>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <Subtitle1 className={styles.onBrand}>{metrics.total}</Subtitle1>
            <Caption1 className={styles.onBrandMuted}>Active applications</Caption1>
          </div>
          <div className={styles.heroStat}>
            <Subtitle1 className={styles.onBrand}>{metrics.review}</Subtitle1>
            <Caption1 className={styles.onBrandMuted}>Require review</Caption1>
          </div>
          <div className={styles.heroStat}>
            <Subtitle1 className={styles.onBrand}>{metrics.resubmitted}</Subtitle1>
            <Caption1 className={styles.onBrandMuted}>Resubmitted</Caption1>
          </div>
        </div>
      </div>
      <div className={styles.heroActions}>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => navigate('/admin/new-application')}>
          New Application
        </Button>
        <Button
          icon={<ClipboardTaskListLtrRegular />}
          onClick={() => navigate('/admin/applications?status=review')}
        >
          Review Pending
        </Button>
        <Button
          icon={<ArrowDownloadRegular />}
          onClick={() => downloadApplicationsCsv(records)}
          disabled={records.length === 0}
        >
          Generate Report
        </Button>
        <Button icon={<ArrowClockwiseRegular />} onClick={() => void reload()} disabled={status === 'loading'}>
          Refresh Data
        </Button>
      </div>
    </Surface>
  );

  if (status === 'error') {
    return (
      <div className={styles.root}>
        {hero}
        <Surface padded={false}>
          <ErrorState title="Couldn't load dashboard data" onRetry={() => void reload()} />
        </Surface>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {hero}

      {status === 'loading' ? (
        <LoadingSkeleton variant="cards" count={6} />
      ) : (
        <section className={styles.kpiGrid} aria-label="Key metrics">
          <KpiCard
            label="Total Applications"
            value={metrics.total}
            icon={<DocumentBulletListRegular />}
            tone="brand"
            deltaPct={trends.total.deltaPct}
            secondary={`${metrics.received} received · ${metrics.review} in review`}
          />
          <KpiCard
            label="Approved"
            value={metrics.approved}
            icon={<CheckmarkCircleRegular />}
            tone="success"
            deltaPct={trends.approved.deltaPct}
            secondary={`${pctOfTotal(metrics.approved)}% of all applications`}
          />
          <KpiCard
            label="Rejected"
            value={metrics.rejected}
            icon={<DismissCircleRegular />}
            tone="danger"
            deltaPct={trends.rejected.deltaPct}
            invertTrend
            secondary={`${pctOfTotal(metrics.rejected)}% of all applications`}
          />
          <KpiCard
            label="Under Review"
            value={metrics.review}
            icon={<ClockRegular />}
            tone="warning"
            deltaPct={trends.review.deltaPct}
            secondary="Awaiting a decision"
          />
          <KpiCard
            label="ReSubmitted"
            value={metrics.resubmitted}
            icon={<ArrowSyncRegular />}
            tone="orange"
            deltaPct={trends.resubmitted.deltaPct}
            secondary="Needs manager review"
          />
          <KpiCard
            label="Approval Rate"
            value={`${metrics.approvalRate}%`}
            icon={<DataTrendingRegular />}
            tone="info"
            secondary={`${metrics.approved} approved of ${decided} decided`}
          />
          <KpiCard
            label="Total Loan Value"
            value={formatCompactCurrency(metrics.totalValue)}
            icon={<MoneyRegular />}
            tone="neutral"
            secondary={`Across ${metrics.total} applications`}
          />
        </section>
      )}

      {status === 'ready' && (
        <>
          <section className={styles.twoCol} aria-label="Analytics">
            <Surface>
              <Subtitle2 className={styles.cardTitle}>Loan Status Distribution</Subtitle2>
              {metrics.total > 0 ? (
                <DonutChart data={donutData} centerValue={metrics.total} centerLabel="Total" />
              ) : (
                <EmptyState title="No data yet" message="Status distribution will appear here." />
              )}
            </Surface>
            <Surface>
              <Subtitle2 className={styles.cardTitle}>Loan Type Breakdown</Subtitle2>
              {barData.length > 0 ? (
                <BarChart data={barData} />
              ) : (
                <EmptyState title="No data yet" message="Loan types will appear here." />
              )}
            </Surface>
          </section>

          <section className={styles.twoCol}>
            <Surface>
              <Subtitle2 className={styles.cardTitle}>Activity Center</Subtitle2>
              {activity.length > 0 ? (
                <ActivityTimeline items={activity} />
              ) : (
                <EmptyState title="No recent activity" message="New applications will show up here." />
              )}
            </Surface>

            <Surface>
              <div className={styles.sectionHead}>
                <Subtitle2 className={styles.cardTitle}>Recent Applications</Subtitle2>
              </div>
              {recent.length > 0 ? (
                <>
                  <div className={styles.recentList}>
                    {recent.map((r) => {
                      const id = r.cr174_loanapplicid ?? r.cr174_referencenumber ?? '';
                      const open = () => navigate(`/admin/applications/${encodeURIComponent(id)}`);
                      return (
                        <div
                          key={id}
                          className={styles.recentItem}
                          role="button"
                          tabIndex={0}
                          aria-label={`View ${r.cr174_referencenumber ?? 'application'}`}
                          onClick={open}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              open();
                            }
                          }}
                        >
                          <div className={styles.recentMain}>
                            <Text weight="semibold" truncate wrap={false}>
                              {r.cr174_applicantname ?? 'Unknown applicant'}
                            </Text>
                            <Caption1 className={styles.recentMeta}>
                              {r.cr174_referencenumber ?? '—'} · {formatRelative(r.cr174_createddate)}
                            </Caption1>
                          </div>
                          <div className={styles.recentRight}>
                            <Text className={styles.amount}>{formatCurrency(r.cr174_amount)}</Text>
                            <StatusBadge label={r._cr174_status_label} size="small" />
                            <ChevronRightRegular className={styles.chevron} aria-hidden />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    className={styles.viewAll}
                    appearance="secondary"
                    onClick={() => navigate('/admin/applications')}
                  >
                    View All Applications
                  </Button>
                </>
              ) : (
                <EmptyState
                  title="No applications yet"
                  message="Create the first application to get started."
                  action={
                    <Button appearance="primary" onClick={() => navigate('/admin/new-application')}>
                      New Application
                    </Button>
                  }
                />
              )}
            </Surface>
          </section>
        </>
      )}
    </div>
  );
}

export default Dashboard;
