import { FlowErrorLogsService, MicrosoftTeamsService } from '../generated';
import type { DynamicChannelAdaptiveCardRequest } from '../generated/models/MicrosoftTeamsModel';

/** "Approved Loans" Teams channel for the Loan Manager project. */
const TEAM_ID = '69ed0184-9b5e-4e45-a5de-94fb834b6c84';
const CHANNEL_ID = '19:cc38311e952a4d2c917c2e3f60faaa72@thread.tacv2';

export interface LoanApprovalNotification {
  applicantName: string;
  referenceNumber: string;
  loanType: string;
  /** Pre-formatted amount (e.g. "₹5,000"). */
  loanAmount: string;
  approvingOfficer: string;
  /** Pre-formatted approval time. */
  approvalTime: string;
}

/**
 * Build the Adaptive Card JSON for a loan approval. Rendered by Teams (not the
 * app), so it uses the Adaptive Card schema rather than Fluent components.
 */
function buildApprovalCard(n: LoanApprovalNotification): object {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'Container',
        style: 'good',
        bleed: true,
        items: [
          { type: 'TextBlock', size: 'Large', weight: 'Bolder', text: '✅ Loan Approved', wrap: true },
          {
            type: 'TextBlock',
            text: `Reference ${n.referenceNumber}`,
            isSubtle: true,
            spacing: 'None',
            wrap: true,
          },
        ],
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Applicant Name', value: n.applicantName },
          { title: 'Reference Number', value: n.referenceNumber },
          { title: 'Loan Type', value: n.loanType },
          { title: 'Loan Amount', value: n.loanAmount },
          { title: 'Status', value: 'Approved' },
          { title: 'Approving Officer', value: n.approvingOfficer },
          { title: 'Approval Time', value: n.approvalTime },
        ],
      },
    ],
  };
}

/**
 * Post the loan-approval Adaptive Card to the "Approved Loans" Teams channel via
 * the generated MicrosoftTeamsService.PostChannelAdaptiveCard operation ("Post
 * your own adaptive card as the Flow bot to a channel").
 *
 * This only demonstrates the Microsoft Teams connector and does NOT replace the
 * existing Approvals-connector approval workflow.
 *
 * Body shape comes from the connector's runtime schema
 * (GetAdaptiveCardInputMetadata, recipientType=channel): `recipient` is an OBJECT
 * with a required `channelId` plus the (internal) `groupId`; `messageBody` is the
 * Adaptive Card JSON string; `messageTitle` is the optional headline. The team is
 * also supplied as the operation's `groupId` argument.
 */
export async function postLoanApprovedCard(notification: LoanApprovalNotification): Promise<void> {
  const body: DynamicChannelAdaptiveCardRequest = {
    recipient: { groupId: TEAM_ID, channelId: CHANNEL_ID },
    messageBody: JSON.stringify(buildApprovalCard(notification)),
    messageTitle: `Loan Approved — ${notification.referenceNumber}`,
  };

  const result = await MicrosoftTeamsService.PostChannelAdaptiveCard(TEAM_ID, body);
  if (!result.success) {
    throw result.error ?? new Error('Microsoft Teams returned an unsuccessful response.');
  }
}

export interface TeamsNotificationFailure {
  applicantName: string;
  referenceNumber: string;
  errorMessage: string;
}

/**
 * Record a Teams notification failure to the SharePoint "Flow Error Logs" list
 * (datasource `flowerrorlogs`) using the existing generated FlowErrorLogsService.
 *
 * The approval is already committed to Dataverse before this runs, so logging is
 * best-effort and never throws — a logging failure must not mask the successful
 * approval. Only call this when the Teams post actually failed; a successful
 * post creates no log entry.
 */
export async function logTeamsNotificationFailure(
  failure: TeamsNotificationFailure,
): Promise<void> {
  try {
    await FlowErrorLogsService.create({
      Title: `Teams Notification failed — ${failure.referenceNumber || 'unknown'}`,
      FlowName: 'Teams Notification',
      Applicant_x0020_Name: failure.applicantName,
      ReferenceNumber: failure.referenceNumber,
      Timestamp: new Date().toISOString(),
      ErrorMessage: failure.errorMessage,
    });
  } catch {
    // Best-effort: swallow secondary logging failures.
  }
}
