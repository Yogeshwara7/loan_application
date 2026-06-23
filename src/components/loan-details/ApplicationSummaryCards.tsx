import { Card, Caption1, Text, makeStyles, tokens } from '@fluentui/react-components';
import {
  PulseRegular,
  PersonRegular,
  TagRegular,
  ClockRegular,
} from '@fluentui/react-icons';
import type { ReactElement, ReactNode } from 'react';
import { StatusBadge } from '../StatusBadge';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  chip: {
    width: '40px',
    height: '40px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  label: { color: tokens.colorNeutralForeground3 },
  value: { fontWeight: tokens.fontWeightSemibold },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightSemibold },
});

interface SummaryCardProps {
  icon: ReactElement;
  label: string;
  children: ReactNode;
}

function SummaryCard({ icon, label, children }: SummaryCardProps) {
  const styles = useStyles();
  return (
    <Card className={styles.card} appearance="filled-alternative">
      <span className={styles.chip} aria-hidden>
        {icon}
      </span>
      <div className={styles.body}>
        <Caption1 className={styles.label}>{label}</Caption1>
        {children}
      </div>
    </Card>
  );
}

export interface ApplicationSummaryCardsProps {
  status: string;
  applicantName: string;
  referenceNumber: string;
  lastActivity: string;
}

/** Responsive 4-card summary row for the application details header area. */
export function ApplicationSummaryCards({
  status,
  applicantName,
  referenceNumber,
  lastActivity,
}: ApplicationSummaryCardsProps) {
  const styles = useStyles();
  return (
    <section className={styles.grid} aria-label="Application summary">
      <SummaryCard icon={<PulseRegular />} label="Application Status">
        <StatusBadge label={status} size="small" />
      </SummaryCard>
      <SummaryCard icon={<PersonRegular />} label="Applicant Name">
        <Text className={styles.value} truncate wrap={false}>
          {applicantName || '—'}
        </Text>
      </SummaryCard>
      <SummaryCard icon={<TagRegular />} label="Reference Number">
        <Text className={styles.mono} truncate wrap={false}>
          {referenceNumber || '—'}
        </Text>
      </SummaryCard>
      <SummaryCard icon={<ClockRegular />} label="Last Activity">
        <Text className={styles.value} truncate wrap={false}>
          {lastActivity || '—'}
        </Text>
      </SummaryCard>
    </section>
  );
}

export default ApplicationSummaryCards;
