import type { Cr174_loanapplicsBase } from '../generated/models/Cr174_loanapplicsModel';
import type { BadgeProps } from '@fluentui/react-components';

/**
 * Domain alias for a loan application record as returned by Dataverse.
 * We work directly against the generated base model so the shape always
 * matches what the service layer produces.
 */
export type LoanApplication = Cr174_loanapplicsBase;

/** Normalised buckets we care about for KPIs and colour coding. */
export type StatusKind =
  | 'approved'
  | 'rejected'
  | 'review'
  | 'received'
  | 'resubmitted'
  | 'other';

/**
 * Dataverse status choice values → labels. Applicants change status to
 * ReSubmitted (470160005) via the separate Canvas reapplication portal; the
 * admin Code App only reads it. Used to resolve raw numeric codes that a flow
 * might return instead of the formatted label.
 */
export const STATUS_CHOICE_LABELS: Record<string, string> = {
  '470160000': 'Received',
  '470160001': 'Under Review',
  '470160002': 'Approved',
  '470160003': 'Rejected',
  '470160004': 'Pending',
  '470160005': 'ReSubmitted',
};

/** Dataverse status choice codes keyed by name (the inverse of STATUS_CHOICE_LABELS). */
export const STATUS_CODE = {
  Received: 470160000,
  UnderReview: 470160001,
  Approved: 470160002,
  Rejected: 470160003,
  Pending: 470160004,
  ReSubmitted: 470160005,
} as const;

/**
 * Classify a status into a known bucket using the human-readable status label.
 * Option-set numeric values are environment specific (resolved via dynamic
 * metadata), so we key off the label text which is stable and present on every
 * record via `_cr174_status_label`.
 */
export function classifyStatus(label?: string | null): StatusKind {
  const value = (label ?? '').trim().toLowerCase();
  if (!value) return 'other';
  // Check resubmission first — "resubmitted" also contains "submit".
  if (value.includes('resubmit') || value.includes('re-submit')) return 'resubmitted';
  if (value.includes('approv')) return 'approved';
  if (value.includes('reject') || value.includes('declin')) return 'rejected';
  if (value.includes('review') || value.includes('pending') || value.includes('progress')) return 'review';
  if (value.includes('receiv') || value.includes('submit') || value.includes('new')) return 'received';
  return 'other';
}

/**
 * Map a status to a Fluent UI Badge colour token.
 * Approved = green, Under Review = amber, Rejected = red, Received = blue.
 */
export function statusBadgeColor(label?: string | null): NonNullable<BadgeProps['color']> {
  switch (classifyStatus(label)) {
    case 'approved':
      return 'success'; // green
    case 'review':
      return 'warning'; // amber
    case 'rejected':
      return 'danger'; // red
    case 'received':
      return 'informative'; // blue
    case 'resubmitted':
      return 'severe'; // orange — flagged for manager attention
    default:
      return 'subtle';
  }
}

export interface LoanKpis {
  total: number;
  approved: number;
  rejected: number;
  review: number;
}

/** Compute the dashboard KPI counts from a set of records. */
export function computeKpis(records: readonly LoanApplication[]): LoanKpis {
  return records.reduce<LoanKpis>(
    (acc, record) => {
      acc.total += 1;
      switch (classifyStatus(record._cr174_status_label)) {
        case 'approved':
          acc.approved += 1;
          break;
        case 'rejected':
          acc.rejected += 1;
          break;
        case 'review':
          acc.review += 1;
          break;
      }
      return acc;
    },
    { total: 0, approved: 0, rejected: 0, review: 0 },
  );
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Format a numeric money value, tolerating undefined/null. */
export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return currencyFormatter.format(value);
}

/** Format an ISO date string into a short, locale-aware date. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Human-friendly text for the status label, falling back gracefully. */
export function statusText(label?: string | null): string {
  const value = (label ?? '').trim();
  return value.length > 0 ? value : 'Unknown';
}

/**
 * Build a de-duplicated list of loan-type options { value, label } derived from
 * live records. Because the loan-type option set is resolved through dynamic
 * Dataverse metadata, the valid numeric values are not known at build time —
 * deriving them from real data guarantees we only ever submit valid choices.
 */
export interface LoanTypeOption {
  value: number;
  label: string;
}

export function deriveLoanTypeOptions(records: readonly LoanApplication[]): LoanTypeOption[] {
  const byValue = new Map<number, string>();
  for (const record of records) {
    if (typeof record.cr174_loantype === 'number') {
      const label = (record._cr174_loantype_label ?? '').trim();
      if (!byValue.has(record.cr174_loantype)) {
        byValue.set(record.cr174_loantype, label || `Type ${record.cr174_loantype}`);
      } else if (label && byValue.get(record.cr174_loantype)?.startsWith('Type ')) {
        byValue.set(record.cr174_loantype, label);
      }
    }
  }
  return [...byValue.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Which detail a loan type needs from the applicant:
 * - `home`      → property value (cr174_propertyvalue)
 * - `education` → college name (cr174_collegename)
 * - `other`     → neither
 * Keyed off the human-readable loan-type label.
 */
export type LoanCategory = 'home' | 'education' | 'other';

export function classifyLoanType(label?: string | null): LoanCategory {
  const value = (label ?? '').toLowerCase();
  if (value.includes('home') || value.includes('property') || value.includes('mortgage')) {
    return 'home';
  }
  if (
    value.includes('educat') ||
    value.includes('student') ||
    value.includes('college') ||
    value.includes('school')
  ) {
    return 'education';
  }
  return 'other';
}

// ---- Dashboard analytics ---------------------------------------------------

export interface DashboardMetrics {
  total: number;
  approved: number;
  rejected: number;
  review: number;
  received: number;
  resubmitted: number;
  /** Approval rate across decided applications (approved / (approved + rejected)). */
  approvalRate: number;
  /** Sum of all loan amounts. */
  totalValue: number;
}

/** Aggregate counts, approval rate and total loan value from real records. */
export function computeDashboardMetrics(records: readonly LoanApplication[]): DashboardMetrics {
  let approved = 0;
  let rejected = 0;
  let review = 0;
  let received = 0;
  let resubmitted = 0;
  let totalValue = 0;
  for (const record of records) {
    switch (classifyStatus(record._cr174_status_label)) {
      case 'approved':
        approved += 1;
        break;
      case 'rejected':
        rejected += 1;
        break;
      case 'review':
        review += 1;
        break;
      case 'received':
        received += 1;
        break;
      case 'resubmitted':
        resubmitted += 1;
        break;
    }
    totalValue += record.cr174_amount ?? 0;
  }
  const decided = approved + rejected;
  const approvalRate = decided === 0 ? 0 : Math.round((approved / decided) * 100);
  return {
    total: records.length,
    approved,
    rejected,
    review,
    received,
    resubmitted,
    approvalRate,
    totalValue,
  };
}

export interface TrendResult {
  current: number;
  previous: number;
  /** Percentage change vs the previous window; null when there is no baseline. */
  deltaPct: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function createdWithin(value: string | null | undefined, start: number, end: number): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return time >= start && time < end;
}

/**
 * Real week-over-week trend derived from `cr174_createddate`: records created in
 * the last 7 days vs the 7 days before that. `predicate` scopes it (e.g. approved
 * only). `deltaPct` is null when there is no prior-week baseline to compare to.
 */
export function weekOverWeek(
  records: readonly LoanApplication[],
  predicate: (record: LoanApplication) => boolean = () => true,
  now: number = Date.now(),
): TrendResult {
  const lastWeekStart = now - 7 * DAY_MS;
  const prevWeekStart = now - 14 * DAY_MS;
  let current = 0;
  let previous = 0;
  for (const record of records) {
    if (!predicate(record)) continue;
    if (createdWithin(record.cr174_createddate, lastWeekStart, now + DAY_MS)) current += 1;
    else if (createdWithin(record.cr174_createddate, prevWeekStart, lastWeekStart)) previous += 1;
  }
  const deltaPct =
    previous === 0 ? (current > 0 ? null : 0) : Math.round(((current - previous) / previous) * 100);
  return { current, previous, deltaPct };
}

export interface StatusSlice {
  kind: StatusKind;
  label: string;
  value: number;
}

/** Status distribution for the donut chart, in display order. */
export function statusDistribution(records: readonly LoanApplication[]): StatusSlice[] {
  const metrics = computeDashboardMetrics(records);
  return [
    { kind: 'approved', label: 'Approved', value: metrics.approved },
    { kind: 'review', label: 'Under Review', value: metrics.review },
    { kind: 'resubmitted', label: 'ReSubmitted', value: metrics.resubmitted },
    { kind: 'rejected', label: 'Rejected', value: metrics.rejected },
    { kind: 'received', label: 'Received', value: metrics.received },
  ];
}

export interface BreakdownItem {
  label: string;
  value: number;
}

/** Loan-type breakdown for the horizontal bar chart, highest first. */
export function loanTypeBreakdown(records: readonly LoanApplication[]): BreakdownItem[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const label = (record._cr174_loantype_label ?? '').trim() || 'Other';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export interface ActivityItem {
  id: string;
  reference: string;
  applicant: string;
  amount?: number | null;
  statusLabel?: string | null;
  date?: string | null;
}

/** Recent application activity derived from real records (newest first). */
export function deriveActivity(records: readonly LoanApplication[], limit = 8): ActivityItem[] {
  return [...records]
    .filter((record) => record.cr174_createddate)
    .sort(
      (a, b) =>
        new Date(b.cr174_createddate ?? 0).getTime() - new Date(a.cr174_createddate ?? 0).getTime(),
    )
    .slice(0, limit)
    .map((record) => ({
      id: record.cr174_loanapplicid ?? record.cr174_referencenumber ?? '',
      reference: record.cr174_referencenumber ?? '—',
      applicant: record.cr174_applicantname ?? 'Unknown applicant',
      amount: record.cr174_amount,
      statusLabel: record._cr174_status_label,
      date: record.cr174_createddate,
    }));
}

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Format a money value compactly (e.g. $1.2M) for headline metrics. */
export function formatCompactCurrency(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '₹0';
  return compactCurrencyFormatter.format(value);
}

/** Short relative time label (e.g. "3h ago", "2d ago") from an ISO date. */
export function formatRelative(value?: string | null, now: number = Date.now()): string {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '—';
  const diff = Math.max(0, now - time);
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** Find a single application by its Dataverse id or reference number. */
export function findApplication(
  records: readonly LoanApplication[],
  id: string,
): LoanApplication | undefined {
  return records.find(
    (record) => record.cr174_loanapplicid === id || record.cr174_referencenumber === id,
  );
}

/** Normalise the unknown error shape from service calls into a message. */
export function toErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
