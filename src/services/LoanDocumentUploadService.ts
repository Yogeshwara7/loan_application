/**
 * Uploads loan supporting documents to SharePoint via a Power Automate HTTP flow.
 *
 * A SharePoint document library surfaced as a Power Apps *tabular* data source can
 * only read/write item metadata — it cannot accept file *content*. So the actual
 * bytes are sent (base64-encoded) to a "When an HTTP request is received" flow,
 * which writes the file into the library, logs a tracker-list row, and returns the
 * stored path. The app then flips `cr174_documentsuploaded` on the loan record.
 */

/** Metadata sent alongside each file so the flow can folder + log it. */
export interface DocumentUploadMeta {
  /** The loan's reference number (LN-…), used as the SharePoint folder. */
  referenceNumber: string;
  applicantName: string;
  applicantEmail: string;
  /** Signed-in user (or applicant email) recorded in the tracker list. */
  uploadedBy: string;
}

/** Normalised result of a single upload. */
export interface DocumentUploadResult {
  success: boolean;
  fileName: string;
  filePath: string;
  referenceNumber: string;
}

const FLOW_URL = import.meta.env.VITE_LOAN_DOC_UPLOAD_FLOW_URL;

/** Whether the document-upload flow endpoint has been configured. */
export function isDocumentUploadConfigured(): boolean {
  return Boolean(FLOW_URL && FLOW_URL.trim());
}

/** Read a File as base64 (without the `data:…;base64,` prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      // result is a data URL: "data:<mime>;base64,<payload>" — keep only the payload.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Loosely-typed flow response (fields may be missing). */
interface RawUploadResponse {
  success?: unknown;
  fileName?: unknown;
  filePath?: unknown;
  referenceNumber?: unknown;
}

/**
 * Uploads a single document to SharePoint through the flow. Resolves with the
 * stored path on success; rejects if the flow is unconfigured or returns a
 * non-2xx / unsuccessful response so the caller can surface a warning.
 */
export async function uploadLoanDocument(
  file: File,
  meta: DocumentUploadMeta,
  signal?: AbortSignal,
): Promise<DocumentUploadResult> {
  if (!FLOW_URL) {
    throw new Error(
      'The document upload flow URL is not configured. Set VITE_LOAN_DOC_UPLOAD_FLOW_URL to your Power Automate HTTP trigger URL.',
    );
  }

  const fileContentBase64 = await fileToBase64(file);

  const response = await fetch(FLOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      referenceNumber: meta.referenceNumber,
      applicantName: meta.applicantName,
      applicantEmail: meta.applicantEmail,
      uploadedBy: meta.uploadedBy,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileContentBase64,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Upload of "${file.name}" failed (HTTP ${response.status}).`);
  }

  // The flow's Response action returns JSON, but tolerate an empty/non-JSON body.
  let data: RawUploadResponse = {};
  try {
    data = (await response.json()) as RawUploadResponse;
  } catch {
    // Treat a 2xx with no body as success.
  }

  if (data.success === false) {
    throw new Error(`Upload of "${file.name}" was rejected by the flow.`);
  }

  return {
    success: true,
    fileName: asString(data.fileName) || file.name,
    filePath: asString(data.filePath),
    referenceNumber: asString(data.referenceNumber) || meta.referenceNumber,
  };
}

/**
 * Uploads many documents sequentially (one POST per file, matching the flow's
 * single-file contract). Returns the per-file outcome; never throws — failures
 * are captured so the caller can report partial success without losing the
 * already-created loan application.
 */
export async function uploadLoanDocuments(
  files: File[],
  meta: DocumentUploadMeta,
  signal?: AbortSignal,
): Promise<{ uploaded: DocumentUploadResult[]; failed: { fileName: string; error: string }[] }> {
  const uploaded: DocumentUploadResult[] = [];
  const failed: { fileName: string; error: string }[] = [];

  for (const file of files) {
    try {
      uploaded.push(await uploadLoanDocument(file, meta, signal));
    } catch (err) {
      failed.push({
        fileName: file.name,
        error: err instanceof Error ? err.message : 'Upload failed.',
      });
    }
  }

  return { uploaded, failed };
}
