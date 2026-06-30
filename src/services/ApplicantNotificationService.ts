/**
 * Sends status-update emails to applicants via the Office 365 Outlook connector
 * (`SendEmailV2`, HTML body). The email is sent from the signed-in officer's
 * mailbox (the connection's account). Best-effort: callers treat failures as
 * non-fatal so a notification problem never blocks the status change.
 */
import { Office365OutlookService } from '../generated';
import { classifyStatus } from '../models/loan';

export interface StatusEmailParams {
  /** Applicant email address. */
  to: string;
  applicantName: string;
  referenceNumber: string;
  /** Human-readable status, e.g. "Approved", "Rejected", "Under Review". */
  statusLabel: string;
  /** Officer's reason — included for rejections. */
  officerComments?: string;
}

const BRAND = 'Innorve Loan Manager';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Status-specific subject + lead paragraph. */
function statusCopy(params: StatusEmailParams): { subject: string; intro: string; extra: string } {
  const ref = params.referenceNumber || 'your application';
  switch (classifyStatus(params.statusLabel)) {
    case 'approved':
      return {
        subject: `Your loan application ${ref} has been approved`,
        intro: 'Good news — your loan application has been <strong>approved</strong>.',
        extra: 'Our team will be in touch with the next steps.',
      };
    case 'rejected':
      return {
        subject: `Update on your loan application ${ref}`,
        intro: 'After review, your loan application has been <strong>declined</strong>.',
        extra: params.officerComments?.trim()
          ? `<p style="margin:16px 0 0"><strong>Reviewer comments:</strong><br/>${escapeHtml(
              params.officerComments.trim(),
            )}</p><p style="margin:16px 0 0">You're welcome to review the feedback and reapply.</p>`
          : "You're welcome to review the feedback and reapply.",
      };
    case 'review':
      return {
        subject: `Your loan application ${ref} is under review`,
        intro: 'Your loan application is now <strong>under review</strong> by our loan officers.',
        extra: "We'll let you know as soon as a decision is made.",
      };
    case 'resubmitted':
      return {
        subject: `We received your resubmitted application ${ref}`,
        intro: 'Your <strong>resubmitted</strong> application has been received and will be reviewed.',
        extra: "We'll keep you posted on its progress.",
      };
    default:
      return {
        subject: `Update on your loan application ${ref}`,
        intro: `The status of your loan application is now <strong>${escapeHtml(
          params.statusLabel,
        )}</strong>.`,
        extra: 'You can track your application status at any time in the applicant portal.',
      };
  }
}

function buildBody(params: StatusEmailParams, intro: string, extra: string): string {
  const name = escapeHtml(params.applicantName || 'there');
  const ref = escapeHtml(params.referenceNumber || '—');
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#242424;max-width:560px">
      <p style="font-size:16px;margin:0 0 12px">Hi ${name},</p>
      <p style="margin:0 0 12px">${intro}</p>
      <table style="border-collapse:collapse;margin:8px 0 12px">
        <tr>
          <td style="padding:4px 12px 4px 0;color:#616161">Reference number</td>
          <td style="padding:4px 0;font-weight:600">${ref}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#616161">Status</td>
          <td style="padding:4px 0;font-weight:600">${escapeHtml(params.statusLabel)}</td>
        </tr>
      </table>
      <p style="margin:0 0 12px">${extra}</p>
      <p style="margin:20px 0 0;color:#616161;font-size:13px">— ${BRAND}</p>
    </div>`;
}

/**
 * Send the applicant a status-update email. Rejects if no recipient or the send
 * fails so the caller can report it; never affects the underlying status change.
 */
export async function sendApplicationStatusEmail(params: StatusEmailParams): Promise<void> {
  const to = params.to.trim();
  if (!to) throw new Error('The applicant has no email address on file.');

  const { subject, intro, extra } = statusCopy(params);
  const result = await Office365OutlookService.SendEmailV2({
    To: to,
    Subject: subject,
    Body: buildBody(params, intro, extra),
  });

  if (!result.success) {
    throw result.error ?? new Error('The email could not be sent.');
  }
}
