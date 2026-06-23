import type { LoanApplication } from '../models/loan';
import { statusText } from '../models/loan';

const HEADERS = [
  'Reference Number',
  'Applicant Name',
  'Applicant Email',
  'College Name',
  'Loan Amount',
  'Property Value',
  'Loan Type',
  'Status',
  'Documents Uploaded',
  'Created Date',
] as const;

function escapeCsv(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Build a CSV string for the given loan applications. */
export function buildApplicationsCsv(records: readonly LoanApplication[]): string {
  const rows = records.map((r) =>
    [
      r.cr174_referencenumber,
      r.cr174_applicantname,
      r.cr174_applicantemail,
      r.cr174_collegename,
      r.cr174_amount,
      r.cr174_propertyvalue,
      r._cr174_loantype_label,
      statusText(r._cr174_status_label),
      r.cr174_documentsuploaded ? 'Yes' : 'No',
      r.cr174_createddate,
    ]
      .map(escapeCsv)
      .join(','),
  );
  return [HEADERS.join(','), ...rows].join('\n');
}

/** Trigger a client-side CSV download of the supplied applications. */
export function downloadApplicationsCsv(
  records: readonly LoanApplication[],
  fileName = 'loan-applications.csv',
): void {
  const csv = buildApplicationsCsv(records);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
