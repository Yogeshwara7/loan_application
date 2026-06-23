import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Body1,
  Caption1,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle1,
  Subtitle2,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  MailRegular,
  PersonRegular,
  ShieldTaskRegular,
  TaskListSquareLtrRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { Office365OutlookService } from '../generated';
import type { MailTipsClientReceive_V2 } from '../generated/models/Office365OutlookModel';
import { useCurrentUser, initialsFromName } from '../context/UserContext';
import { useLoanData } from '../context/LoanDataContext';
import {
  classifyStatus,
  deriveActivity,
  formatCurrency,
  formatRelative,
  toErrorMessage,
} from '../models/loan';
import { Surface } from '../components/Surface';
import { DetailList } from '../components/DetailList';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';

type MailboxStatus = 'loading' | 'ready' | 'error';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXL,
    flexWrap: 'wrap',
    backgroundImage: `linear-gradient(120deg, ${tokens.colorBrandBackground}, ${tokens.colorBrandBackgroundPressed})`,
    color: tokens.colorNeutralForegroundOnBrand,
    border: 'none',
  },
  bannerText: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: 0 },
  onBrand: { color: tokens.colorNeutralForegroundOnBrand },
  onBrandMuted: { color: tokens.colorNeutralForegroundOnBrand, opacity: 0.9 },
  avatarRing: { boxShadow: `0 0 0 3px ${tokens.colorNeutralForegroundOnBrand}` },
  badges: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap', marginTop: tokens.spacingVerticalXS },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
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
  approvalList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  approvalItem: {
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
  approvalMain: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  chevron: { color: tokens.colorNeutralForeground3, fontSize: '20px', flexShrink: 0 },
  muted: { color: tokens.colorNeutralForeground3 },
});

export function MyProfile() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { user, ready } = useCurrentUser();
  const { records } = useLoanData();

  const [mailboxStatus, setMailboxStatus] = useState<MailboxStatus>('loading');
  const [mailbox, setMailbox] = useState<MailTipsClientReceive_V2 | undefined>();
  const [mailboxError, setMailboxError] = useState<string>('');

  // Preserve the existing Office 365 Outlook integration (best-effort enrichment).
  useEffect(() => {
    if (!ready) return;
    if (!user.email) {
      setMailboxStatus('ready');
      return;
    }
    let active = true;
    (async () => {
      setMailboxStatus('loading');
      try {
        const result = await Office365OutlookService.GetMailTips_V2({
          MailTipsOptions: 'automaticReplies, mailboxFullStatus, maxMessageSize',
          EmailAddresses: [user.email],
        });
        if (!active) return;
        if (result.success) {
          setMailbox(result.data?.value?.[0]);
          setMailboxStatus('ready');
        } else {
          setMailboxError(
            toErrorMessage(result.error, 'Connector profile information is currently unavailable.'),
          );
          setMailboxStatus('error');
        }
      } catch (err) {
        if (!active) return;
        setMailboxError(
          toErrorMessage(err, 'Connector profile information is currently unavailable.'),
        );
        setMailboxStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, user.email]);

  const recentApprovals = useMemo(
    () => records.filter((r) => classifyStatus(r._cr174_status_label) === 'approved').slice(0, 4),
    [records],
  );
  const activity = useMemo(() => deriveActivity(records, 6), [records]);

  if (!ready) {
    return <LoadingState label="Loading your workspace…" />;
  }

  return (
    <div className={styles.root}>
      <Surface className={styles.banner}>
        <Avatar
          name={user.fullName || 'User'}
          initials={initialsFromName(user.fullName || 'User')}
          size={72}
          color="colorful"
          className={styles.avatarRing}
          aria-hidden
        />
        <div className={styles.bannerText}>
          <Subtitle1 className={styles.onBrand}>{user.fullName || 'User'}</Subtitle1>
          {user.email && <Text className={styles.onBrandMuted}>{user.email}</Text>}
          <div className={styles.badges}>
            <Badge appearance="tint" color="brand">
              Microsoft 365
            </Badge>
          </div>
        </div>
      </Surface>

      <div className={styles.twoCol}>
        <Surface>
          <Subtitle2 className={styles.sectionTitle}>
            <span className={styles.chip} aria-hidden>
              <PersonRegular />
            </span>
            Account
          </Subtitle2>
          <DetailList
            items={[
              { label: 'Name', value: user.fullName || '—' },
              { label: 'Email', value: user.email || '—' },
              { label: 'Object ID', value: user.objectId || '—' },
              { label: 'Tenant ID', value: user.tenantId || '—' },
            ]}
          />
        </Surface>

        <Surface>
          <Subtitle2 className={styles.sectionTitle}>
            <span className={styles.chip} aria-hidden>
              <MailRegular />
            </span>
            Mailbox (Office 365 Outlook)
          </Subtitle2>
          {mailboxStatus === 'loading' && (
            <Spinner size="small" label="Checking mailbox…" labelPosition="after" />
          )}
          {mailboxStatus === 'error' && (
            <MessageBar intent="warning">
              <MessageBarBody>{mailboxError}</MessageBarBody>
            </MessageBar>
          )}
          {mailboxStatus === 'ready' && !mailbox && (
            <Body1 className={styles.muted}>
              No additional mailbox information was returned by the connector.
            </Body1>
          )}
          {mailboxStatus === 'ready' && mailbox && (
            <DetailList
              items={[
                {
                  label: 'Mailbox status',
                  value: (
                    <Badge appearance="tint" color={mailbox.mailboxFull ? 'danger' : 'success'}>
                      {mailbox.mailboxFull ? 'Full' : 'Healthy'}
                    </Badge>
                  ),
                },
                { label: 'Automatic replies', value: mailbox.automaticReplies?.message ? 'On' : 'Off' },
                ...(typeof mailbox.maxMessageSize === 'number'
                  ? [
                      {
                        label: 'Max message size',
                        value: `${Math.round(mailbox.maxMessageSize / (1024 * 1024))} MB`,
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </Surface>
      </div>

      <div className={styles.twoCol}>
        <Surface>
          <Subtitle2 className={styles.sectionTitle}>
            <span className={styles.chip} aria-hidden>
              <TaskListSquareLtrRegular />
            </span>
            Recent Approvals
          </Subtitle2>
          {recentApprovals.length > 0 ? (
            <div className={styles.approvalList}>
              {recentApprovals.map((r) => {
                const id = r.cr174_loanapplicid ?? r.cr174_referencenumber ?? '';
                const open = () => navigate(`/applications/${encodeURIComponent(id)}`);
                return (
                  <div
                    key={id}
                    className={styles.approvalItem}
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
                    <div className={styles.approvalMain}>
                      <Text weight="semibold" truncate wrap={false}>
                        {r.cr174_applicantname ?? 'Unknown applicant'}
                      </Text>
                      <Caption1 className={styles.muted}>
                        {formatCurrency(r.cr174_amount)} · {formatRelative(r.cr174_createddate)}
                      </Caption1>
                    </div>
                    <StatusBadge label={r._cr174_status_label} size="small" />
                    <ChevronRightRegular className={styles.chevron} aria-hidden />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No approvals yet" message="Approved applications will appear here." />
          )}
        </Surface>

        <Surface>
          <Subtitle2 className={styles.sectionTitle}>
            <span className={styles.chip} aria-hidden>
              <ShieldTaskRegular />
            </span>
            Recent Activity
          </Subtitle2>
          {activity.length > 0 ? (
            <ActivityTimeline items={activity} />
          ) : (
            <EmptyState title="No recent activity" message="Workspace activity will appear here." />
          )}
        </Surface>
      </div>
    </div>
  );
}

export default MyProfile;
