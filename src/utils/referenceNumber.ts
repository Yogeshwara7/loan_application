/**
 * Loan reference-number + created-date helpers.
 *
 * Mirrors the Canvas app behaviour:
 *   Reference = "LN-" & Text(Now(), "yyyymmddhhmmss")
 *   Created   = Now()
 *
 * The reference number uses the LOCAL time at the moment of submission (like
 * Power Apps `Now()`), while the created date is returned as a UTC ISO 8601
 * string that Dataverse DateTime columns accept directly.
 */

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * Generate a unique loan reference number in the format `LN-YYYYMMDDHHMMSS`
 * (e.g. `LN-20260623143045`) from the supplied date (defaults to now).
 *
 * Granularity is one second, which matches the Canvas app — a single user
 * cannot realistically submit two applications within the same second.
 */
export function generateReferenceNumber(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `LN-${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

export interface SubmissionStamp {
  /** `LN-YYYYMMDDHHMMSS` reference number. */
  referenceNumber: string;
  /** UTC ISO 8601 timestamp for the Dataverse created-date column. */
  createdDate: string;
}

/**
 * Build the reference number and created date together from a single instant,
 * so both values describe the exact moment of submission.
 */
export function buildSubmissionStamp(date: Date = new Date()): SubmissionStamp {
  return {
    referenceNumber: generateReferenceNumber(date),
    createdDate: date.toISOString(),
  };
}
