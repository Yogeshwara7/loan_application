import { Subtitle2, makeStyles, tokens } from '@fluentui/react-components';
import { DetailList } from './DetailList';
import { StatusBadge } from './StatusBadge';
import { Surface } from './Surface';
import { formatCurrency } from '../models/loan';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  sectionTitle: {
    color: tokens.colorNeutralForeground2,
  },
});

export interface LoanSummaryCardProps {
  applicantName: string;
  applicantEmail: string;
  phone?: string;
  collegeName: string;
  amount?: number | null;
  propertyValue?: number | null;
  loanTypeLabel?: string;
  reference?: string;
  statusLabel?: string | null;
  /** Render inside a Surface (default true). Set false to embed in another surface. */
  framed?: boolean;
}

/** Reusable applicant + loan summary, used in the wizard review and elsewhere. */
export function LoanSummaryCard({
  applicantName,
  applicantEmail,
  phone,
  collegeName,
  amount,
  propertyValue,
  loanTypeLabel,
  reference,
  statusLabel,
  framed = true,
}: LoanSummaryCardProps) {
  const styles = useStyles();

  const applicantItems = [
    { label: 'Applicant Name', value: applicantName || '—' },
    { label: 'Applicant Email', value: applicantEmail || '—' },
    ...(phone && phone.trim() ? [{ label: 'Phone Number', value: phone.trim() }] : []),
    ...(collegeName ? [{ label: 'College Name', value: collegeName }] : []),
  ];

  const loanItems = [
    ...(reference ? [{ label: 'Reference #', value: reference }] : []),
    { label: 'Loan Type', value: loanTypeLabel || '—' },
    { label: 'Loan Amount', value: formatCurrency(amount) },
    ...(propertyValue !== undefined && propertyValue !== null
      ? [{ label: 'Property Value', value: formatCurrency(propertyValue) }]
      : []),
    ...(statusLabel !== undefined
      ? [{ label: 'Status', value: <StatusBadge label={statusLabel} /> }]
      : []),
  ];

  const content = (
    <div className={styles.root}>
      <div className={styles.section}>
        <Subtitle2 className={styles.sectionTitle}>Applicant</Subtitle2>
        <DetailList items={applicantItems} />
      </div>
      <div className={styles.section}>
        <Subtitle2 className={styles.sectionTitle}>Loan details</Subtitle2>
        <DetailList items={loanItems} />
      </div>
    </div>
  );

  return framed ? <Surface>{content}</Surface> : content;
}

export default LoanSummaryCard;
