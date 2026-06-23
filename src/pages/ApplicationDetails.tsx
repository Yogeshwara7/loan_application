import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Caption1,
  MessageBar,
  MessageBarBody,
  Subtitle2,
  Text,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  ArrowClockwiseRegular,
  CommentRegular,
  HistoryRegular,
  StreamRegular,
} from '@fluentui/react-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useLoanData } from '../context/LoanDataContext';
import { findApplication, toErrorMessage } from '../models/loan';
import {
  deriveTimelineFromRecord,
  getLoanTimeline,
  isTimelineFlowConfigured,
  type LoanTimelineResponse,
} from '../services/LoanTimelineService';
import { Surface } from '../components/Surface';
import { StatusBadge } from '../components/StatusBadge';
import { ApplicationSummaryCards } from '../components/loan-details/ApplicationSummaryCards';
import { LoanTimeline } from '../components/loan-details/LoanTimeline';
import { LoanActivityFeed } from '../components/loan-details/LoanActivityFeed';
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

export function ApplicationDetails() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const decodedId = decodeURIComponent(id);
  const { records, status: dataStatus } = useLoanData();

  const record = findApplication(records, decodedId);
  const referenceNumber = record?.cr174_referencenumber ?? decodedId;

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [data, setData] = useState<LoanTimelineResponse | null>(null);
  const [error, setError] = useState<string>('');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setPageStatus('loading');
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

  const backButton = (
    <Button
      className={styles.back}
      appearance="subtle"
      icon={<ArrowLeftRegular />}
      onClick={() => navigate('/applications')}
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
              <Button appearance="primary" onClick={() => navigate('/applications')}>
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
        <Button
          appearance="secondary"
          icon={<ArrowClockwiseRegular />}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </Surface>

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
              <HistoryRegular />
            </span>
            Loan Timeline
          </Subtitle2>
          {data.timeline.length > 0 ? (
            <LoanTimeline steps={data.timeline} />
          ) : (
            <EmptyState title="No timeline yet" message="Lifecycle steps will appear here." />
          )}
        </Surface>

        <div className={styles.col}>
          <Surface>
            <Subtitle2 className={styles.sectionTitle}>
              <span className={styles.chip} aria-hidden>
                <CommentRegular />
              </span>
              Officer Review
            </Subtitle2>
            {data.officerComments ? (
              <div className={styles.quote}>
                <CommentRegular className={styles.quoteIcon} aria-hidden />
                <Text className={styles.quoteText}>{data.officerComments}</Text>
              </div>
            ) : (
              <EmptyState
                icon={<CommentRegular />}
                title="No officer comments"
                message="No reviewer comments have been added for this application yet."
              />
            )}
          </Surface>

          <Surface>
            <Subtitle2 className={styles.sectionTitle}>
              <span className={styles.chip} aria-hidden>
                <StreamRegular />
              </span>
              Activity Feed
            </Subtitle2>
            {data.timeline.length > 0 ? (
              <LoanActivityFeed steps={data.timeline} />
            ) : (
              <EmptyState title="No activity yet" message="Activity will appear here." />
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}

export default ApplicationDetails;
