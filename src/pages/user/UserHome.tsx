import { useMemo } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Subtitle1,
  Subtitle2,
  Title1,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  AddCircleRegular,
  DocumentTableRegular,
  DocumentBulletListRegular,
  ClockRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  EditRegular,
  HomeRegular,
  BookRegular,
  WalletRegular,
  QuestionCircleRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useLoanData } from '../../context/LoanDataContext';
import { useCurrentUser, firstName } from '../../context/UserContext';
import { computeDashboardMetrics } from '../../models/loan';
import { Surface } from '../../components/Surface';
import { KpiCard } from '../../components/KpiCard';
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

const LOAN_TYPES = [
  { icon: <HomeRegular />, title: 'Home Loan', text: 'Finance your property purchase.' },
  { icon: <BookRegular />, title: 'Education Loan', text: 'Fund your studies and college fees.' },
  { icon: <WalletRegular />, title: 'Personal Loan', text: 'Flexible funds for your personal needs.' },
];

function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXL },
  hero: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXXL,
    backgroundImage: `linear-gradient(120deg, ${tokens.colorBrandBackground} 0%, ${tokens.colorBrandBackgroundPressed} 100%)`,
    color: tokens.colorNeutralForegroundOnBrand,
    border: 'none',
  },
  heroText: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: 0 },
  onBrand: { color: tokens.colorNeutralForegroundOnBrand },
  onBrandMuted: { color: tokens.colorNeutralForegroundOnBrand, opacity: 0.9 },
  heroActions: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  sectionHead: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  sectionSubtitle: { color: tokens.colorNeutralForeground2 },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
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

  return (
    <div className={styles.root}>
      {/* Hero */}
      <Surface className={styles.hero}>
        <div className={styles.heroText}>
          <Caption1 className={styles.onBrandMuted}>{greeting()},</Caption1>
          <Title1 as="h1" className={styles.onBrand}>
            Welcome, {firstName(user.fullName)}
          </Title1>
          <Body1 className={styles.onBrandMuted}>
            Apply for a loan, track your applications, and stay informed every step of the way.
          </Body1>
        </div>
        <div className={styles.heroActions}>
          <Button
            appearance="primary"
            icon={<AddCircleRegular />}
            onClick={() => navigate('/user/apply-loan')}
          >
            Apply for a Loan
          </Button>
          <Button icon={<DocumentTableRegular />} onClick={() => navigate('/user/my-applications')}>
            View My Applications
          </Button>
        </div>
      </Surface>

      {/* Dashboard-style overview */}
      <section className={styles.section} aria-label="Your applications overview">
        <div className={styles.sectionHead}>
          <Subtitle2 as="h2">Your applications at a glance</Subtitle2>
        </div>
        {status === 'loading' ? (
          <LoadingState label="Loading your applications…" />
        ) : hasApplications ? (
          <div className={styles.kpiGrid}>
            <KpiCard
              label="Total Applications"
              value={metrics.total}
              icon={<DocumentBulletListRegular />}
              tone="brand"
            />
            <KpiCard
              label="Under Review"
              value={metrics.review}
              icon={<ClockRegular />}
              tone="warning"
            />
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
        ) : (
          <Surface padded={false}>
            <EmptyState
              icon={<AddCircleRegular />}
              title="Start your loan journey"
              message="You haven't applied yet. Submit your first application and you'll be able to track its progress right here."
              action={
                <Button appearance="primary" onClick={() => navigate('/user/apply-loan')}>
                  Apply for a Loan
                </Button>
              }
            />
          </Surface>
        )}
      </section>

      {/* Loan process overview */}
      <section className={styles.section} aria-label="How it works">
        <div className={styles.sectionHead}>
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

      {/* Supported loan types */}
      <section className={styles.section} aria-label="Supported loan types">
        <div className={styles.sectionHead}>
          <Subtitle2 as="h2">Supported loan types</Subtitle2>
          <Body1 className={styles.sectionSubtitle}>Choose the option that fits your needs.</Body1>
        </div>
        <div className={styles.cardGrid}>
          {LOAN_TYPES.map((type) => (
            <Surface key={type.title} interactive>
              <div className={styles.tile}>
                <span className={styles.tileIcon} aria-hidden>
                  {type.icon}
                </span>
                <Subtitle1>{type.title}</Subtitle1>
                <Body1 className={styles.tileText}>{type.text}</Body1>
              </div>
            </Surface>
          ))}
        </div>
      </section>

      {/* Quick help */}
      <section className={styles.section} aria-label="Need help">
        <Surface>
          <div className={styles.helpRow}>
            <div className={styles.heroText}>
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
      </section>
    </div>
  );
}

export default UserHome;
