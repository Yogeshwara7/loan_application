/**
 * Reads loan documents back for a given application from the SharePoint
 * **LoanDocumentTracker** list. The upload flow writes one tracker row per file
 * with `FileIdentifier` = the loan's reference number, so we match on that exact
 * column (reliable — unlike matching the document library's computed fields).
 *
 * The openable file link is built from the tracker's `FilePath` (server-relative
 * to the site) plus the site base URL.
 */
import { LoanDocumentTrackerService } from '../generated';
import type { LoanDocumentTrackerRead } from '../generated/models/LoanDocumentTrackerModel';

export interface LoanDocument {
  id: string;
  /** Original file name. */
  name: string;
  /** Direct URL to open the file in SharePoint (empty if it can't be built). */
  link: string;
  /** Who uploaded it (signed-in user at upload time). */
  uploadedBy: string;
  /** ISO timestamp / date the file was uploaded. */
  uploadedOn: string;
}

// Site that hosts the LoanDocuments library. Used to turn the tracker's
// server-relative FilePath (e.g. "/LoanDocuments/LN-…_file.pdf") into an
// absolute URL. Override via env if the site ever changes.
const SITE_URL = (
  import.meta.env.VITE_SHAREPOINT_SITE_URL ?? 'https://innorvellc.sharepoint.com/sites/LoanManagement'
).replace(/\/+$/, '');

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * A row belongs to the application if its reference number appears in any of the
 * row's columns (the reference is stored under different internal names across
 * setups — e.g. `Title`, `FileIdentifier`, or a renamed `ReferenceNumber`
 * column). Exact, trimmed equality avoids false positives from substrings like
 * the FilePath.
 */
function rowMatchesReference(row: LoanDocumentTrackerRead, reference: string): boolean {
  return Object.values(row as Record<string, unknown>).some(
    (value) => typeof value === 'string' && value.trim() === reference,
  );
}

function toAbsoluteLink(filePath: string): string {
  const path = filePath.trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Fetch the documents belonging to a loan application by its reference number.
 * Never throws — returns an empty array on any failure so the details page keeps
 * rendering.
 */
export async function getLoanDocuments(referenceNumber: string): Promise<LoanDocument[]> {
  const reference = referenceNumber.trim();
  if (!reference) return [];

  try {
    const result = await LoanDocumentTrackerService.getAll();
    if (!result.success || !result.data) return [];

    return result.data
      .filter((row: LoanDocumentTrackerRead) => rowMatchesReference(row, reference))
      .map((row: LoanDocumentTrackerRead) => {
        const name = str(row.FileName) || str(row.Title) || 'Document';
        return {
          id: String(row.ID ?? row['{Identifier}'] ?? name),
          name,
          link: toAbsoluteLink(str(row.FilePath)),
          uploadedBy: str(row.UploadedBy),
          uploadedOn: str(row.UploadDate) || str(row.Created),
        };
      });
  } catch {
    return [];
  }
}
