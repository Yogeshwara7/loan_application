/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Power Automate "When an HTTP request is received" trigger URL for the loan timeline flow. */
  readonly VITE_LOAN_TIMELINE_FLOW_URL?: string;
  /** Power Automate HTTP trigger URL for the SharePoint document-upload flow. */
  readonly VITE_LOAN_DOC_UPLOAD_FLOW_URL?: string;
  /** SharePoint site URL hosting the LoanDocuments library (for building file links). */
  readonly VITE_SHAREPOINT_SITE_URL?: string;
}
