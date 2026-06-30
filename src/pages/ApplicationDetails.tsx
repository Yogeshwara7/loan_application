import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle2,
  Text,
  Textarea,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  ArrowClockwiseRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  CommentRegular,
  NoteRegular,
  StreamRegular,
  TagRegular,
} from '@fluentui/react-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Cr174_loanapplicsService } from '../generated';
import { useLoanData } from '../context/LoanDataContext';
import { useCurrentUser } from '../context/UserContext';
import {
  STATUS_CHOICE_LABELS,
  classifyStatus,
  findApplication,
  formatCurrency,
  toErrorMessage,
} from '../models/loan';
import { formatDateTime } from '../models/errorLog';
import {
  deriveTimelineFromRecord,
  getLoanTimeline,
  isTimelineFlowConfigured,
  type LoanTimelineResponse,
} from '../services/LoanTimelineService';
import {
  logTeamsNotificationFailure,
  postLoanApprovedCard,
} from '../services/TeamsNotificationService';
import { sendApplicationStatusEmail } from '../services/ApplicantNotificationService';
import { Surface } from '../components/Surface';
import { StatusBadge } from '../components/StatusBadge';
import { ApplicationSummaryCards } from '../components/loan-details/ApplicationSummaryCards';
import { ApplicationDocuments } from '../components/loan-details/ApplicationDocuments';
import { LoanTimeline } from '../components/loan-details/LoanTimeline';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

type PageStatus = 'loading' | 'error' | 'empty' | 'ready';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: 0 },
  back: { alignSelf: 'flex-start' },
  headerActions: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  reference: { fontFamily: tokens.fontFamilyMonospace },
  muted: { color: tokens.colorNeutralForeground3 },
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
    marginBottom: tokens.spacingVerticalL,
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
});

// Dataverse status choice values for the two manager decisions.
const STATUS_APPROVED = 470160002;
const STATUS_REJECTED = 470160003;

// All selectable statuses for the "Set status" menu (code → label), in choice order.
// Changing status writes cr174_status, which is what server-side flows trigger on
// (e.g. moving to Under Review).
const STATUS_OPTIONS = Object.entries(STATUS_CHOICE_LABELS).map(([code, label]) => ({
  code: Number(code),
  label,
}));

/**
 * Return a copy of the timeline data with the displayed status updated. Used for
 * optimistic UI so the header badge, summary card, and current-status timeline
 * step reflect the decision immediately.
 */
function withStatus(data: LoanTimelineResponse, status: string): LoanTimelineResponse {
  return {
    ...data,
    status,
    timeline: data.timeline.map((step) => (/current/i.test(step.step) ? { ...step, status } : step)),
  };
}

export function ApplicationDetails() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const decodedId = decodeURIComponent(id);
  const { records, status: dataStatus, reload } = useLoanData();
  const { user } = useCurrentUser();

  const record = findApplication(records, decodedId);
  const referenceNumber = record?.cr174_referencenumber ?? decodedId;

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [data, setData] = useState<LoanTimelineResponse | null>(null);
  const [error, setError] = useState<string>('');
  // The status code currently being written (for per-control spinners), or null.
  const [pendingStatus, setPendingStatus] = useState<number | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    intent: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  // Show the loading skeleton only on the first load; later refreshes (incl. the
  // post-decision sync) keep the current content visible so an optimistic update
  // is never replaced by a skeleton flash.
  const hasLoadedRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!hasLoadedRef.current) setPageStatus('loading');
      setError('');
      try {
        let result: LoanTimelineResponse;
        if (isTimelineFlowConfigured()) {
          result = await getLoanTimeline(referenceNumber, signal);
        } else if (record) {
          result = deriveTimelineFromRecord(record);
        } else {
          setData(null);
          setPageStatus('empty');
          return;
        }

        if (!result.status && result.timeline.length === 0) {
          setData(null);
          setPageStatus('empty');
          return;
        }

        setData(result);
        setPageStatus('ready');
        hasLoadedRef.current = true;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(toErrorMessage(err, 'We could not load this application’s timeline.'));
        setPageStatus('error');
      }
    },
    [referenceNumber, record],
  );

  useEffect(() => {
    // Wait for the shared Dataverse fetch so we can resolve the reference number.
    if (dataStatus === 'loading') return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [dataStatus, load]);

  // Optimistic status change. Updates the UI immediately, writes cr174_status to
  // Dataverse (which is what server-side flows trigger on — e.g. Under Review),
  // runs the Approve→Teams workflow when approving, and rolls back on failure.
  const handleStatusUpdate = useCallback(
    async (statusCode: number, statusLabel: string, officerComments?: string): Promise<boolean> => {
      // Prevent duplicate submissions while a status change is already in flight.
      if (pendingStatus !== null) return false;

      const recordId = record?.cr174_loanapplicid;
      if (!recordId || !data) {
        setActionBanner({
          intent: 'error',
          text: 'Cannot update status: the application record was not found in Dataverse.',
        });
        return false;
      }

      const previousData = data; // snapshot for rollback

      setPendingStatus(statusCode);
      setActionBanner(null);
      // Optimistic update — reflect the new status (and any comment) immediately.
      setData({
        ...withStatus(data, statusLabel),
        ...(officerComments !== undefined ? { officerComments } : {}),
      });

      try {
        const updateResult = await Cr174_loanapplicsService.update(recordId, {
          cr174_status: statusCode,
          ...(officerComments !== undefined ? { cr174_officercomments: officerComments } : {}),
        });
        if (!updateResult.success) {
          throw updateResult.error ?? new Error('Failed to update the application status.');
        }

        let intent: 'success' | 'warning' = 'success';
        let message: string;

        if (statusCode === STATUS_APPROVED) {
          // Approve workflow, unchanged: post the Teams card (best-effort — a Teams
          // failure does NOT roll back the approval) and log failures to SharePoint.
          let teamsNote: string;
          try {
            await postLoanApprovedCard({
              applicantName: record?.cr174_applicantname ?? '—',
              referenceNumber: record?.cr174_referencenumber ?? referenceNumber,
              loanType: record?._cr174_loantype_label ?? '—',
              loanAmount: formatCurrency(record?.cr174_amount),
              approvingOfficer: user.fullName || 'Unknown officer',
              approvalTime: formatDateTime(new Date().toISOString()),
            });
            teamsNote = ' An Adaptive Card was posted to the Approved Loans Teams channel.';
          } catch (teamsErr) {
            const teamsError = toErrorMessage(teamsErr, 'unknown error');
            await logTeamsNotificationFailure({
              applicantName: record?.cr174_applicantname ?? '—',
              referenceNumber: record?.cr174_referencenumber ?? referenceNumber,
              errorMessage: teamsError,
            });
            teamsNote = ` The Teams notification failed and was logged to Flow Error Logs: ${teamsError}`;
            intent = 'warning';
          }
          message = `Application approved.${teamsNote}`;
        } else if (statusCode === STATUS_REJECTED) {
          message = 'Application rejected.';
        } else {
          message = `Status updated to ${statusLabel}.`;
        }

        // Notify the applicant by email (best-effort — a send failure never rolls
        // back the status change).
        const applicantEmail = record?.cr174_applicantemail?.trim();
        if (applicantEmail) {
          try {
            await sendApplicationStatusEmail({
              to: applicantEmail,
              applicantName: record?.cr174_applicantname ?? 'Applicant',
              referenceNumber: record?.cr174_referencenumber ?? referenceNumber,
              statusLabel,
              officerComments: statusCode === STATUS_REJECTED ? officerComments : undefined,
            });
            message += ` The applicant was emailed at ${applicantEmail}.`;
          } catch (emailErr) {
            message += ` The applicant email could not be sent: ${toErrorMessage(emailErr, 'unknown error')}`;
            intent = 'warning';
          }
        }

        setActionBanner({ intent, text: message });

        // Sync the shared Dataverse records; the load effect then silently
        // refreshes this page's data (no skeleton) with the persisted status.
        await reload();
        return true;
      } catch (err) {
        // Dataverse update failed — restore the previous status and surface the error.
        setData(previousData);
        setActionBanner({
          intent: 'error',
          text: toErrorMessage(err, `The status could not be updated to ${statusLabel}.`),
        });
        return false;
      } finally {
        setPendingStatus(null);
      }
    },
    [pendingStatus, data, record, referenceNumber, user.fullName, reload],
  );

  // Rejecting opens a dialog to capture the officer's reason, which is saved to
  // cr174_officercomments alongside the status change.
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const confirmReject = useCallback(async () => {
    const ok = await handleStatusUpdate(STATUS_REJECTED, 'Rejected', rejectComment.trim());
    if (ok) {
      setRejectOpen(false);
      setRejectComment('');
    }
  }, [handleStatusUpdate, rejectComment]);

  const backButton = (
    <Button
      className={styles.back}
      appearance="subtle"
      icon={<ArrowLeftRegular />}
      onClick={() => navigate('/admin/applications')}
    >
      Back to Applications
    </Button>
  );

  if (pageStatus === 'loading') {
    return (
      <div className={styles.root}>
        {backButton}
        <LoadingSkeleton variant="cards" count={4} />
        <div className={styles.columns}>
          <LoadingSkeleton variant="block" />
          <div className={styles.col}>
            <LoadingSkeleton variant="list" count={3} />
            <LoadingSkeleton variant="list" count={3} />
          </div>
        </div>
      </div>
    );
  }

  if (pageStatus === 'error') {
    return (
      <div className={styles.root}>
        {backButton}
        <Surface padded={false}>
          <ErrorState
            title="Couldn't load application details"
            message={error}
            onRetry={() => void load()}
          />
        </Surface>
      </div>
    );
  }

  if (pageStatus === 'empty' || !data) {
    return (
      <div className={styles.root}>
        {backButton}
        <Surface padded={false}>
          <EmptyState
            title="No application details found"
            message="We couldn't find timeline details for this application."
            action={
              <Button appearance="primary" onClick={() => navigate('/admin/applications')}>
                View all applications
              </Button>
            }
          />
        </Surface>
      </div>
    );
  }

  const displayName = data.applicantName || record?.cr174_applicantname || '—';
  const lastActivity = data.timeline.at(-1)?.step ?? data.status ?? '—';

  return (
    <div className={styles.root}>
      <Surface className={styles.header}>
        <div className={styles.headerLeft}>
          {backButton}
          <div className={styles.titleRow}>
            <Title2 className={styles.reference}>{data.referenceNumber || referenceNumber}</Title2>
            <StatusBadge label={data.status} size="large" />
          </div>
          <Caption1 className={styles.muted}>Applicant: {displayName}</Caption1>
        </div>
        <div className={styles.headerActions}>
          {classifyStatus(data.status) !== 'approved' && record && (
            <Button
              appearance="primary"
              icon={
                pendingStatus === STATUS_APPROVED ? <Spinner size="tiny" /> : <CheckmarkCircleRegular />
              }
              onClick={() => void handleStatusUpdate(STATUS_APPROVED, 'Approved')}
              disabled={pendingStatus !== null}
            >
              {pendingStatus === STATUS_APPROVED ? 'Approving…' : 'Approve & Notify'}
            </Button>
          )}
          {classifyStatus(data.status) !== 'rejected' && record && (
            <Button
              appearance="secondary"
              icon={
                pendingStatus === STATUS_REJECTED ? <Spinner size="tiny" /> : <DismissCircleRegular />
              }
              onClick={() => setRejectOpen(true)}
              disabled={pendingStatus !== null}
            >
              {pendingStatus === STATUS_REJECTED ? 'Rejecting…' : 'Reject'}
            </Button>
          )}
          {record && (
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <MenuButton
                  appearance="secondary"
                  icon={<TagRegular />}
                  disabled={pendingStatus !== null}
                >
                  Set status
                </MenuButton>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {STATUS_OPTIONS.map((option) => {
                    const isCurrent =
                      (data.status ?? '').trim().toLowerCase() === option.label.toLowerCase();
                    return (
                      <MenuItem
                        key={option.code}
                        disabled={isCurrent}
                        onClick={() =>
                          option.code === STATUS_REJECTED
                            ? setRejectOpen(true)
                            : void handleStatusUpdate(option.code, option.label)
                        }
                      >
                        {option.label}
                        {isCurrent ? ' (current)' : ''}
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </MenuPopover>
            </Menu>
          )}
          <Button
            appearance="secondary"
            icon={<ArrowClockwiseRegular />}
            onClick={() => void load()}
            disabled={pendingStatus !== null}
          >
            Refresh
          </Button>
        </div>
      </Surface>

      {actionBanner && (
        <MessageBar intent={actionBanner.intent}>
          <MessageBarBody>{actionBanner.text}</MessageBarBody>
        </MessageBar>
      )}

      {!isTimelineFlowConfigured() && (
        <MessageBar intent="info">
          <MessageBarBody>
            Showing status from Dataverse. Set <code>VITE_LOAN_TIMELINE_FLOW_URL</code> to load the
            live timeline from your Power Automate flow.
          </MessageBarBody>
        </MessageBar>
      )}

      <ApplicationSummaryCards
        status={data.status}
        applicantName={displayName}
        referenceNumber={data.referenceNumber || referenceNumber}
        lastActivity={lastActivity}
      />

      <div className={styles.columns}>
        <Surface>
          <Subtitle2 className={styles.sectionTitle}>
            <span className={styles.chip} aria-hidden>
              <StreamRegular />
            </span>
            Activity Feed
          </Subtitle2>
          {data.timeline.length > 0 ? (
            <LoanTimeline steps={data.timeline} />
          ) : (
            <EmptyState title="No activity yet" message="Activity will appear here." />
          )}
        </Surface>

        <div className={styles.col}>
          {data.officerComments.trim() && (
            <Surface>
              <Subtitle2 className={styles.sectionTitle}>
                <span className={styles.chip} aria-hidden>
                  <CommentRegular />
                </span>
                Officer Review
              </Subtitle2>
              <div className={styles.quote}>
                <CommentRegular className={styles.quoteIcon} aria-hidden />
                <Text className={styles.quoteText}>{data.officerComments}</Text>
              </div>
            </Surface>
          )}

          <Surface>
            <Subtitle2 className={styles.sectionTitle}>
              <span className={styles.chip} aria-hidden>
                <NoteRegular />
              </span>
              User Note
            </Subtitle2>
            {record?.cr174_usernote?.trim() ? (
              <div className={styles.quote}>
                <NoteRegular className={styles.quoteIcon} aria-hidden />
                <Text className={styles.quoteText}>{record.cr174_usernote}</Text>
              </div>
            ) : (
              <EmptyState
                icon={<NoteRegular />}
                title="No user note"
                message="The applicant didn't add a note to this application."
              />
            )}
          </Surface>

          <ApplicationDocuments
            referenceNumber={data.referenceNumber || referenceNumber}
            flagged={record?.cr174_documentsuploaded}
          />
        </div>
      </div>

      <Dialog
        open={rejectOpen}
        onOpenChange={(_e, dialogData) => {
          if (pendingStatus === null) setRejectOpen(dialogData.open);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Reject application</DialogTitle>
            <DialogContent>
              <Field
                label="Reason for rejection"
                required
                hint="Saved to the officer comments and shown to the applicant when they reapply."
              >
                <Textarea
                  value={rejectComment}
                  onChange={(_e, d) => setRejectComment(d.value)}
                  placeholder="Explain why this application is being rejected…"
                  rows={4}
                  resize="vertical"
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setRejectOpen(false)}
                disabled={pendingStatus !== null}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                icon={
                  pendingStatus === STATUS_REJECTED ? <Spinner size="tiny" /> : <DismissCircleRegular />
                }
                onClick={() => void confirmReject()}
                disabled={!rejectComment.trim() || pendingStatus !== null}
              >
                {pendingStatus === STATUS_REJECTED ? 'Rejecting…' : 'Reject application'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

export default ApplicationDetails;
