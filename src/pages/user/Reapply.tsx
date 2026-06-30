import {
  Body1,
  Button,
  Caption1,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Subtitle2,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArrowLeftRegular, CommentRegular } from '@fluentui/react-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useLoanData } from '../../context/LoanDataContext';
import { STATUS_CODE, findApplication, formatCurrency, formatDate } from '../../models/loan';
import { PageHeader } from '../../components/PageHeader';
import { Surface } from '../../components/Surface';
import { DetailList } from '../../components/DetailList';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import {
  LoanApplicationForm,
  type LoanApplicationFormValues,
} from '../../components/LoanApplicationForm';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  back: { alignSelf: 'flex-start' },
  subtitleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
  },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightSemibold },
  columns: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 1.8fr)',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
    '@media (max-width: 960px)': { gridTemplateColumns: '1fr' },
  },
  col: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
  },
  chip: {
    width: '28px',
    height: '28px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    backgroundColor: tokens.colorPaletteDarkOrangeBackground2,
    color: tokens.colorPaletteDarkOrangeForeground2,
  },
  quote: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeft: `3px solid ${tokens.colorPaletteRedBorderActive}`,
  },
  quoteIcon: { color: tokens.colorPaletteRedForeground1, fontSize: '20px', flexShrink: 0 },
  quoteText: { fontStyle: 'italic' },
});

export function Reapply() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const decodedId = decodeURIComponent(id);
  const { records, status, error, reload } = useLoanData();

  const backButton = (
    <Button
      className={styles.back}
      appearance="subtle"
      icon={<ArrowLeftRegular />}
      onClick={() => navigate('/user/my-applications')}
    >
      Back to My Applications
    </Button>
  );

  if (status === 'loading') {
    return (
      <div className={styles.root}>
        {backButton}
        <LoadingState label="Loading application…" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.root}>
        {backButton}
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Couldn't load this application</MessageBarTitle>
            {error}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => void reload()}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      </div>
    );
  }

  const record = findApplication(records, decodedId);
  if (!record) {
    return (
      <div className={styles.root}>
        {backButton}
        <Surface padded={false}>
          <EmptyState
            title="Application not found"
            message="We couldn't find this application to reapply. It may have been removed or the link is invalid."
            action={
              <Button appearance="primary" onClick={() => navigate('/user/my-applications')}>
                Back to My Applications
              </Button>
            }
          />
        </Surface>
      </div>
    );
  }

  const referenceNumber = record.cr174_referencenumber ?? decodedId;
  const remarks = (record.cr174_officercomments ?? '').trim();
  const applicationId = record.cr174_loanapplicid ?? referenceNumber;

  // Pre-populate the shared form from the previous application (string values).
  const initialValues: Partial<LoanApplicationFormValues> = {
    applicantName: record.cr174_applicantname ?? '',
    applicantEmail: record.cr174_applicantemail ?? '',
    phone: record.cr174_phonenumber ?? '',
    userNote: record.cr174_usernote ?? '',
    collegeName: record.cr174_collegename ?? '',
    amount: record.cr174_amount != null ? String(record.cr174_amount) : '',
    propertyValue: record.cr174_propertyvalue != null ? String(record.cr174_propertyvalue) : '',
    loanType: record.cr174_loantype != null ? String(record.cr174_loantype) : '',
  };

  return (
    <div className={styles.root}>
      {backButton}

      <PageHeader
        title="Reapply"
        subtitle={
          <span className={styles.subtitleRow}>
            <span>
              Original Reference: <span className={styles.mono}>{referenceNumber}</span>
            </span>
            {record.cr174_applicantname && <span>· {record.cr174_applicantname}</span>}
          </span>
        }
        actions={<StatusBadge label={record._cr174_status_label} size="large" />}
      />

      <div className={styles.columns}>
        {/* Left: reason for rejection + read-only previous summary */}
        <div className={styles.col}>
          {remarks && (
            <Surface>
              <Subtitle2 className={styles.sectionTitle}>
                <span className={styles.chip} aria-hidden>
                  <CommentRegular />
                </span>
                Officer Remarks
              </Subtitle2>
              <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Reason for rejection</Caption1>
              <div className={styles.quote} style={{ marginTop: tokens.spacingVerticalS }}>
                <CommentRegular className={styles.quoteIcon} aria-hidden />
                <Text className={styles.quoteText}>{remarks}</Text>
              </div>
            </Surface>
          )}

          <Surface>
            <Subtitle2 className={styles.sectionTitle}>Previous Application</Subtitle2>
            <DetailList
              items={[
                { label: 'Applicant Name', value: record.cr174_applicantname ?? '—' },
                { label: 'Loan Type', value: record._cr174_loantype_label ?? '—' },
                { label: 'Loan Amount', value: formatCurrency(record.cr174_amount) },
                { label: 'Submitted Date', value: formatDate(record.cr174_createddate) },
                {
                  label: 'Reference Number',
                  value: <span className={styles.mono}>{referenceNumber}</span>,
                },
              ]}
            />
            <Body1 style={{ color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalM }}>
              This summary is read-only. Update the details on the right and resubmit to create a new
              application.
            </Body1>
          </Surface>
        </div>

        {/* Right: the shared LoanApplicationForm, prefilled and submitting as ReSubmitted */}
        <div className={styles.col}>
          <LoanApplicationForm
            hideHeader
            initialValues={initialValues}
            statusCode={STATUS_CODE.ReSubmitted}
            draftKey={`innorve-reapply-${applicationId}`}
            successActions={
              <>
                <Button appearance="primary" onClick={() => navigate('/user/my-applications')}>
                  View My Applications
                </Button>
                <Button onClick={() => navigate('/user/home')}>Back Home</Button>
              </>
            }
            onCancel={() => navigate('/user/my-applications')}
            cancelLabel="Cancel"
          />
        </div>
      </div>
    </div>
  );
}

export default Reapply;
