import type { FlowErrorLogsRead } from '../generated/models/FlowErrorLogsModel';

/** A "Flow Error Logs" SharePoint list item (generated model). */
export type ErrorLog = FlowErrorLogsRead;

export type FlowCategory = 'email' | 'approval' | 'timeline' | 'other';

/**
 * Bucket an error by the flow that produced it, keyed off the flow name and the
 * error text. Used for the admin monitoring counters.
 */
export function classifyFlow(log: ErrorLog): FlowCategory {
  const text = `${log.FlowName ?? ''} ${log.ErrorMessage ?? ''}`.toLowerCase();
  if (
    text.includes('email') ||
    text.includes('mail') ||
    text.includes('outlook') ||
    text.includes('notif')
  ) {
    return 'email';
  }
  if (text.includes('approv')) return 'approval';
  if (text.includes('timeline')) return 'timeline';
  return 'other';
}

export interface ErrorMetrics {
  total: number;
  email: number;
  approval: number;
  timeline: number;
  /** ISO timestamp of the most recent error, if any. */
  latest?: string;
}

/** Best-available timestamp for an error (custom Timestamp column, else Created). */
export function logTimestamp(log: ErrorLog): string | undefined {
  return log.Timestamp ?? log.Created ?? undefined;
}

/** Stable row id for the grid. */
export function logId(log: ErrorLog): string {
  return String(log.ID ?? log['{Identifier}'] ?? log.ReferenceNumber ?? '');
}

/** Aggregate error counters + latest error time. */
export function computeErrorMetrics(logs: readonly ErrorLog[]): ErrorMetrics {
  let email = 0;
  let approval = 0;
  let timeline = 0;
  let latest: string | undefined;
  for (const log of logs) {
    switch (classifyFlow(log)) {
      case 'email':
        email += 1;
        break;
      case 'approval':
        approval += 1;
        break;
      case 'timeline':
        timeline += 1;
        break;
    }
    const ts = logTimestamp(log);
    if (ts && (!latest || new Date(ts).getTime() > new Date(latest).getTime())) {
      latest = ts;
    }
  }
  return { total: logs.length, email, approval, timeline, latest };
}

/** Distinct, sorted flow names for the filter dropdown. */
export function distinctFlowNames(logs: readonly ErrorLog[]): string[] {
  const names = new Set<string>();
  for (const log of logs) {
    const name = (log.FlowName ?? '').trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Format an ISO timestamp as a locale date + time (e.g. "23 Jun 2026, 2:30 PM"). */
export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return dateTimeFormatter.format(parsed);
}
