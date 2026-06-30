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
import {
  ArrowLeftRegular,
  ArrowSyncRegular,
  ArrowDownloadRegular,
  PersonRegular,
  DocumentMultipleRegular,
  CommentRegular,
  HistoryRegular,
} from '@fluentui/react-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useLoanData } from '../../context/LoanDataContext';
import type { StatusKind } from '../../models/loan';
import {
  classifyLoanType,
  classifyStatus,
  findApplication,
  formatCurrency,
  formatDate,
} from '../../models/loan';
import { deriveTimelineFromRecord } from '../../services/LoanTimelineService';
import { PageHeader } from '../../components/PageHeader';
import { Surface } from '../../components/Surface';
import { DetailList } from '../../components/DetailList';
import { StatusBadge, DocumentsBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { LoanTimeline } from '../../components/loan-details/LoanTimeline';

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
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
    '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
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
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  group: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  groupLabel: { color: tokens.colorNeutralForeground2 },
  quote: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
  },
  quoteIcon: { color: tokens.colorBrandForeground1, fontSize: '20px', flexShrink: 0 },
  quoteText: { fontStyle: 'italic' },
  docList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXS,
  },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  statusCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: tokens.spacingVerticalXXS,
  },
  statusHintText: { color: tokens.colorNeutralForeground3 },
});

/** Short "what's next" line shown beneath the status badge. */
function statusHint(kind: StatusKind): string {
  switch (kind) {
    case 'received':
      return 'Awaiting officer review.';
    case 'review':
      return 'Currently being reviewed by our team.';
    case 'approved':
      return 'Approved — no further action needed.';
    case 'rejected':
      return 'You can reapply with updated details.';
    case 'resubmitted':
      return 'Updated application is under review.';
    default:
      return 'Your application is being processed.';
  }
}

interface StatusPanel {
  intent: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

/** Contextual applicant-facing message for the current status. */
function statusPanel(kind: StatusKind): StatusPanel {
  switch (kind) {
    case 'received':
      return { intent: 'info', text: 'Your application has been received successfully.' };
    case 'review':
      return { intent: 'info', text: 'Our loan officers are currently reviewing your application.' };
    case 'approved':
      return { intent: 'success', text: 'Congratulations! Your application has been approved.' };
    case 'rejected':
      return {
        intent: 'error',
        text: 'Your application was rejected. Please review the remarks below before reapplying.',
      };
    case 'resubmitted':
      return { intent: 'info', text: 'Your updated application has been received and is under review.' };
    default:
      return { intent: 'info', text: 'Your application is being processed.' };
  }
}

export function MyApplicationDetails() {
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

  // Loading — reuse the shared LoadingState (no refetch; context owns the data).
  if (status === 'loading') {
    return (
      <div className={styles.root}>
        {backButton}
        <LoadingState label="Loading application…" />
      </div>
    );
  }

  // Load failure — Fluent MessageBar with retry.
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

  // Not found / invalid id — reuse the shared EmptyState.
  const record = findApplication(records, decodedId);
  if (!record) {
    return (
      <div className={styles.root}>
        {backButton}
        <Surface padded={false}>
          <EmptyState
            title="Application not found"
            message="We couldn't find this application. It may have been removed or the link is invalid."
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
  const kind = classifyStatus(record._cr174_status_label);
  const category = classifyLoanType(record._cr174_loantype_label);
  const panel = statusPanel(kind);
  const remarks = (record.cr174_officercomments ?? '').trim();
  const attachments = record['{Attachments}'] ?? [];
  const hasDocuments = Boolean(record.cr174_documentsuploaded) || attachments.length > 0;

  // Reuse the admin timeline: derive steps from the record already in context.
  const timeline = deriveTimelineFromRecord(record);

  return (
    <div className={styles.root}>
      {backButton}

      <PageHeader
        title="Application Details"
        subtitle={
          <span className={styles.subtitleRow}>
            <span>
              Reference Number: <span className={styles.mono}>{referenceNumber}</span>
            </span>
            {record.cr174_applicantname && <span>· {record.cr174_applicantname}</span>}
          </span>
        }
        actions={<StatusBadge label={record._cr174_status_label} size="large" />}
      />

      <MessageBar intent={panel.intent}>
        <MessageBarBody>{panel.text}</MessageBarBody>
      </MessageBar>

      <div className={styles.columns}>
        {/* Left column: summary, remarks, documents */}
        <div className={styles.col}>
          <Surface>
            <Subtitle2 className={styles.sectionTitle}>
              <span className={styles.chip} aria-hidden>
                <PersonRegular />
              </span>
              Application Summary
            </Subtitle2>
            <div className={styles.group}>
              <div>
                <Caption1 className={styles.groupLabel}>Applicant Information</Caption1>
                <DetailList
                  items={[
                    { label: 'Applicant Name', value: record.cr174_applicantname ?? '—' },
                    { label: 'Applicant Email', value: record.cr174_applicantemail ?? '—' },
                    ...(category === 'education'
                      ? [{ label: 'College Name', value: record.cr174_collegename ?? '—' }]
                      : []),
                  ]}
                />
              </div>
              <div>
                <Caption1 className={styles.groupLabel}>Loan Information</Caption1>
                <DetailList
                  items={[
                    { label: 'Loan Type', value: record._cr174_loantype_label ?? '—' },
                    { label: 'Loan Amount', value: formatCurrency(record.cr174_amount) },
                    ...(category === 'home'
                      ? [{ label: 'Property Value', value: formatCurrency(record.cr174_propertyvalue) }]
                      : []),
                  ]}
                />
              </div>
              <div>
                <Caption1 className={styles.groupLabel}>Application Information</Caption1>
                <DetailList
                  items={[
                    { label: 'Reference Number', value: <span className={styles.mono}>{referenceNumber}</span> },
                    { label: 'Created Date', value: formatDate(record.cr174_createddate) },
                    {
                      label: 'Documents Uploaded',
                      value: <DocumentsBadge uploaded={record.cr174_documentsuploaded} />,
                    },
                    {
                      label: 'Current Status',
                      value: (
                        <div className={styles.statusCell}>
                          <StatusBadge label={record._cr174_status_label} />
                          <Caption1 className={styles.statusHintText}>{statusHint(kind)}</Caption1>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </Surface>

          {remarks && (
            <Surface>
              <Subtitle2 className={styles.sectionTitle}>
                <span className={styles.chip} aria-hidden>
                  <CommentRegular />
                </span>
                Officer Remarks
              </Subtitle2>
              <div className={styles.quote}>
                <CommentRegular className={styles.quoteIcon} aria-hidden />
                <Text className={styles.quoteText}>{remarks}</Text>
              </div>
            </Surface>
          )}

          {hasDocuments && (
            <Surface>
              <Subtitle2 className={styles.sectionTitle}>
                <span className={styles.chip} aria-hidden>
                  <DocumentMultipleRegular />
                </span>
                Uploaded Documents
              </Subtitle2>
              <div className={styles.docList}>
                {attachments.length > 0 ? (
                  attachments.map((doc, index) => (
                    <div className={styles.docRow} key={doc.Id ?? index}>
                      <Body1>{doc.DisplayName ?? `Document ${index + 1}`}</Body1>
                      <DocumentsBadge uploaded />
                    </div>
                  ))
                ) : (
                  <div className={styles.docRow}>
                    <Body1>Application documents</Body1>
                    <DocumentsBadge uploaded />
                  </div>
                )}
              </div>
            </Surface>
          )}
        </div>

        {/* Right column: timeline */}
        <div className={styles.col}>
          <Surface>
            <Subtitle2 className={styles.sectionTitle}>
              <span className={styles.chip} aria-hidden>
                <HistoryRegular />
              </span>
              Application Timeline
            </Subtitle2>
            <LoanTimeline steps={timeline.timeline} />
          </Surface>
        </div>
      </div>

      <div className={styles.actions}>
        <Button appearance="secondary" icon={<ArrowLeftRegular />} onClick={() => navigate('/user/my-applications')}>
          Back to My Applications
        </Button>
        {kind === 'rejected' && (
          <Button
            appearance="primary"
            icon={<ArrowSyncRegular />}
            onClick={() => navigate(`/user/reapply/${encodeURIComponent(record.cr174_loanapplicid ?? referenceNumber)}`)}
          >
            Reapply
          </Button>
        )}
        {kind === 'approved' && (
          <Button appearance="secondary" icon={<ArrowDownloadRegular />} disabled>
            Download Approval Letter
          </Button>
        )}
      </div>
    </div>
  );
}

export default MyApplicationDetails;
