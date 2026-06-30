import { useMemo } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Subtitle1,
  Subtitle2,
  Title1,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  AddCircleRegular,
  DocumentTableRegular,
  DocumentBulletListRegular,
  ClockRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  ChevronRightRegular,
  EditRegular,
  QuestionCircleRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useLoanData } from '../../context/LoanDataContext';
import { useCurrentUser, firstName } from '../../context/UserContext';
import { computeDashboardMetrics, formatCurrency, formatDate } from '../../models/loan';
import { Surface } from '../../components/Surface';
import { KpiCard } from '../../components/KpiCard';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';

const PROCESS_STEPS = [
  { icon: <EditRegular />, title: 'Apply', text: 'Submit your application in a few guided steps.' },
  { icon: <ClockRegular />, title: 'Review', text: 'Our loan officers review your details.' },
  {
    icon: <CheckmarkCircleRegular />,
    title: 'Decision',
    text: 'Get approved — or clear feedback so you can reapply.',
  },
];

function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXL },

  // Hero
  hero: {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXXL,
    paddingBlock: tokens.spacingVerticalXXL,
    paddingInline: tokens.spacingHorizontalXXL,
    backgroundImage: `linear-gradient(125deg, ${tokens.colorBrandBackground} 0%, ${tokens.colorBrandBackgroundPressed} 60%, ${tokens.colorPaletteBerryBackground3} 130%)`,
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.border('none'),
  },
  heroGlow: {
    position: 'absolute',
    top: '-40%',
    right: '-5%',
    width: '320px',
    height: '320px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'rgba(255,255,255,0.12)',
    filter: 'blur(8px)',
    pointerEvents: 'none',
  },
  heroText: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    minWidth: 0,
    maxWidth: '560px',
  },
  onBrand: { color: tokens.colorNeutralForegroundOnBrand },
  onBrandMuted: { color: tokens.colorNeutralForegroundOnBrand, opacity: 0.88 },
  heroActions: {
    position: 'relative',
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
  heroPrimary: {
    backgroundColor: tokens.colorNeutralForegroundOnBrand,
    color: tokens.colorBrandForeground1,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover, color: tokens.colorBrandForeground1 },
    ':hover:active': { backgroundColor: tokens.colorNeutralBackground1Pressed, color: tokens.colorBrandForeground1 },
  },
  heroGhost: {
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.border('1px', 'solid', 'rgba(255,255,255,0.6)'),
    ':hover': { backgroundColor: 'rgba(255,255,255,0.14)', color: tokens.colorNeutralForegroundOnBrand },
    ':hover:active': { backgroundColor: 'rgba(255,255,255,0.2)', color: tokens.colorNeutralForegroundOnBrand },
  },

  // Sections
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  sectionHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  sectionHeadText: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, minWidth: 0 },
  sectionSubtitle: { color: tokens.colorNeutralForeground2 },

  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },

  // Recent applications list
  recentList: { display: 'flex', flexDirection: 'column' },
  recentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalM,
    cursor: 'pointer',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ':last-child': { ...shorthands.borderBottom('0') },
    ':hover': { backgroundColor: tokens.colorNeutralBackground2Hover },
  },
  recentIcon: {
    width: '40px',
    height: '40px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  recentMain: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1, gap: '2px' },
  recentRef: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightSemibold },
  recentMeta: { color: tokens.colorNeutralForeground3 },
  recentRight: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, flexShrink: 0 },
  recentAmount: { fontWeight: tokens.fontWeightSemibold, whiteSpace: 'nowrap' },
  chevron: { color: tokens.colorNeutralForeground3, fontSize: '18px' },

  // Process tiles
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  tile: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, height: '100%' },
  tileIcon: {
    width: '44px',
    height: '44px',
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  tileStep: { color: tokens.colorBrandForeground2, fontWeight: tokens.fontWeightSemibold },
  tileText: { color: tokens.colorNeutralForeground2 },

  // Help
  helpRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
  },
  helpText: { color: tokens.colorNeutralForeground2, maxWidth: '560px' },
});

export function UserHome() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { records, status } = useLoanData();
  const { user } = useCurrentUser();

  const metrics = useMemo(() => computeDashboardMetrics(records), [records]);
  const hasApplications = metrics.total > 0;

  // Latest applications first (by created date), capped for the home preview.
  const recent = useMemo(
    () =>
      [...records]
        .sort(
          (a, b) =>
            new Date(b.cr174_createddate ?? 0).getTime() - new Date(a.cr174_createddate ?? 0).getTime(),
        )
        .slice(0, 4),
    [records],
  );

  const openApplication = (id?: string, reference?: string) =>
    navigate(`/user/my-applications/${encodeURIComponent(id ?? reference ?? '')}`);

  return (
    <div className={styles.root}>
      {/* Hero */}
      <Surface className={styles.hero} padded={false}>
        <span className={styles.heroGlow} aria-hidden />
        <div className={styles.heroText}>
          <Caption1 className={styles.onBrandMuted}>{greeting()},</Caption1>
          <Title1 as="h1" className={styles.onBrand}>
            Welcome back, {firstName(user.fullName)}
          </Title1>
          <Body1 className={styles.onBrandMuted}>
            {hasApplications
              ? `You have ${metrics.total} application${metrics.total === 1 ? '' : 's'} — ${
                  metrics.approved
                } approved and ${metrics.review} under review. Apply again or track progress below.`
              : 'Apply for a loan in minutes and track every step right here.'}
          </Body1>
          <div className={styles.heroActions}>
            <Button
              className={styles.heroPrimary}
              icon={<AddCircleRegular />}
              onClick={() => navigate('/user/apply-loan')}
            >
              Apply for a Loan
            </Button>
            <Button
              className={styles.heroGhost}
              icon={<DocumentTableRegular />}
              onClick={() => navigate('/user/my-applications')}
            >
              View My Applications
            </Button>
          </div>
        </div>
      </Surface>

      {/* Loading */}
      {status === 'loading' ? (
        <LoadingState label="Loading your applications…" />
      ) : hasApplications ? (
        <>
          {/* KPIs */}
          <section className={styles.section} aria-label="Your applications overview">
            <div className={styles.kpiGrid}>
              <KpiCard
                label="Total Applications"
                value={metrics.total}
                icon={<DocumentBulletListRegular />}
                tone="brand"
              />
              <KpiCard label="Under Review" value={metrics.review} icon={<ClockRegular />} tone="warning" />
              <KpiCard
                label="Approved"
                value={metrics.approved}
                icon={<CheckmarkCircleRegular />}
                tone="success"
              />
              <KpiCard
                label="Rejected"
                value={metrics.rejected}
                icon={<DismissCircleRegular />}
                tone="danger"
              />
            </div>
          </section>

          {/* Recent applications */}
          <section className={styles.section} aria-label="Recent applications">
            <div className={styles.sectionHead}>
              <Subtitle2 as="h2">Recent applications</Subtitle2>
              <Button
                appearance="transparent"
                icon={<ChevronRightRegular />}
                iconPosition="after"
                onClick={() => navigate('/user/my-applications')}
              >
                View all
              </Button>
            </div>
            <Surface>
              <div className={styles.recentList}>
                {recent.map((app) => (
                  <div
                    key={app.cr174_loanapplicid ?? app.cr174_referencenumber}
                    className={styles.recentRow}
                    onClick={() => openApplication(app.cr174_loanapplicid, app.cr174_referencenumber)}
                  >
                    <span className={styles.recentIcon} aria-hidden>
                      <DocumentBulletListRegular />
                    </span>
                    <div className={styles.recentMain}>
                      <Body1 className={styles.recentRef}>{app.cr174_referencenumber ?? '—'}</Body1>
                      <Caption1 className={styles.recentMeta}>
                        {(app._cr174_loantype_label ?? 'Loan') + ' · ' + formatDate(app.cr174_createddate)}
                      </Caption1>
                    </div>
                    <div className={styles.recentRight}>
                      <Body1 className={styles.recentAmount}>{formatCurrency(app.cr174_amount)}</Body1>
                      <StatusBadge label={app._cr174_status_label} />
                      <ChevronRightRegular className={styles.chevron} aria-hidden />
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          </section>
        </>
      ) : (
        // Empty — first-time applicant
        <Surface padded={false}>
          <EmptyState
            icon={<AddCircleRegular />}
            title="Start your loan journey"
            message="You haven't applied yet. Submit your first application and track its progress right here."
            action={
              <Button appearance="primary" icon={<AddCircleRegular />} onClick={() => navigate('/user/apply-loan')}>
                Apply for a Loan
              </Button>
            }
          />
        </Surface>
      )}

      {/* How it works */}
      <section className={styles.section} aria-label="How it works">
        <div className={styles.sectionHeadText}>
          <Subtitle2 as="h2">How it works</Subtitle2>
          <Body1 className={styles.sectionSubtitle}>From application to decision in three simple steps.</Body1>
        </div>
        <div className={styles.cardGrid}>
          {PROCESS_STEPS.map((step, index) => (
            <Surface key={step.title} interactive>
              <div className={styles.tile}>
                <span className={styles.tileIcon} aria-hidden>
                  {step.icon}
                </span>
                <Caption1 className={styles.tileStep}>Step {index + 1}</Caption1>
                <Subtitle1>{step.title}</Subtitle1>
                <Body1 className={styles.tileText}>{step.text}</Body1>
              </div>
            </Surface>
          ))}
        </div>
      </section>

      {/* Quick help */}
      <Surface>
        <div className={styles.helpRow}>
          <div className={styles.sectionHeadText}>
            <Subtitle2 as="h2">Need help?</Subtitle2>
            <Body1 className={styles.helpText}>
              Learn how to apply, what each status means, and how to reapply if your application is
              declined.
            </Body1>
          </div>
          <Button icon={<QuestionCircleRegular />} onClick={() => navigate('/user/help')}>
            Visit Help Center
          </Button>
        </div>
      </Surface>
    </div>
  );
}

export default UserHome;
