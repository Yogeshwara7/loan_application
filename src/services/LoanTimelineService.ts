import type { LoanApplication } from '../models/loan';
import { STATUS_CHOICE_LABELS, statusText } from '../models/loan';

/** A single lifecycle step as returned by the Power Automate flow. */
export interface LoanTimelineStep {
  step: string;
  status: string;
  /**
   * Optional ISO timestamp. Not returned today, but the flow may later be
   * extended to include Dataverse status-history times — the UI renders it
   * automatically when present and falls back to a placeholder otherwise.
   */
  timestamp?: string;
}

/** Shape of the Power Automate HTTP flow response. */
export interface LoanTimelineResponse {
  referenceNumber: string;
  applicantName: string;
  status: string;
  officerComments: string;
  /** Notes the applicant entered when resubmitting via the Canvas portal. */
  resubmissionNotes: string;
  timeline: LoanTimelineStep[];
}

const FLOW_URL = import.meta.env.VITE_LOAN_TIMELINE_FLOW_URL;

/** Whether the Power Automate timeline endpoint has been configured. */
export function isTimelineFlowConfigured(): boolean {
  return Boolean(FLOW_URL && FLOW_URL.trim());
}

/** Loosely-typed payload as received over the wire (fields may be missing or strings). */
interface RawTimelineResponse {
  referenceNumber?: unknown;
  applicantName?: unknown;
  status?: unknown;
  officerComments?: unknown;
  resubmissionNotes?: unknown;
  timeline?: unknown;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The flow returns `timeline` as a JSON **string** (a common Power Automate
 * Response-action behaviour), so accept either a string or an already-parsed
 * array and coerce each entry into a {@link LoanTimelineStep}.
 */
function parseTimeline(value: unknown): LoanTimelineStep[] {
  let raw: unknown = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .filter((entry) => typeof entry.step === 'string' && entry.step.trim().length > 0)
    .map((entry) => {
      const timestamp = asString(entry.timestamp);
      return {
        step: String(entry.step),
        status: asString(entry.status),
        ...(timestamp ? { timestamp } : {}),
      };
    });
}

const isNumericCode = (value: string): boolean => /^\d+$/.test(value);

/**
 * Resolve a possibly-numeric status to a friendly label. Some flows emit the
 * raw Dataverse choice value (e.g. "470160005") instead of its label; map known
 * codes (incl. ReSubmitted) via STATUS_CHOICE_LABELS, else use the supplied
 * fallback (the top-level status) so the UI never shows a bare number.
 */
function resolveStatusLabel(raw: string, fallback: string): string {
  if (!isNumericCode(raw)) return raw;
  return STATUS_CHOICE_LABELS[raw] ?? (fallback && !isNumericCode(fallback) ? fallback : raw);
}

function normalize(data: RawTimelineResponse, referenceNumber: string): LoanTimelineResponse {
  const status = resolveStatusLabel(asString(data.status), '');

  const timeline = parseTimeline(data.timeline).map((step) => ({
    ...step,
    status: resolveStatusLabel(step.status, status),
  }));

  return {
    referenceNumber: asString(data.referenceNumber) || referenceNumber,
    applicantName: asString(data.applicantName),
    status,
    officerComments: asString(data.officerComments),
    resubmissionNotes: asString(data.resubmissionNotes),
    timeline,
  };
}

/**
 * Calls the Power Automate HTTP flow and returns the loan timeline payload.
 *
 * The flow is a "When an HTTP request is received" trigger that accepts a JSON
 * body of `{ referenceNumber }` and responds with the {@link LoanTimelineResponse}
 * shape. If your trigger expects a GET with a query parameter instead, swap the
 * `method`/`body` below for `?referenceNumber=` on the URL.
 */
export async function getLoanTimeline(
  referenceNumber: string,
  signal?: AbortSignal,
): Promise<LoanTimelineResponse> {
  if (!FLOW_URL) {
    throw new Error(
      'The loan timeline flow URL is not configured. Set VITE_LOAN_TIMELINE_FLOW_URL to your Power Automate HTTP trigger URL.',
    );
  }

  const response = await fetch(FLOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceNumber }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`The timeline request failed (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as RawTimelineResponse;
  return normalize(data, referenceNumber);
}

/**
 * Fallback timeline derived from the Dataverse record. Used when the flow URL is
 * not configured so the page still renders the live status without the flow.
 */
export function deriveTimelineFromRecord(record: LoanApplication): LoanTimelineResponse {
  const status = statusText(record._cr174_status_label);
  return {
    referenceNumber: record.cr174_referencenumber ?? '',
    applicantName: record.cr174_applicantname ?? '',
    status,
    officerComments: record.cr174_officercomments ?? '',
    resubmissionNotes: '',
    timeline: [
      { step: 'Application Submitted', status: 'Completed' },
      { step: 'Application Received', status: 'Completed' },
      { step: 'Current Status', status },
    ],
  };
}
