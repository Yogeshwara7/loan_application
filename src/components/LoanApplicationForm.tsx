import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Divider,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  ProgressBar,
  Spinner,
  Subtitle1,
  Subtitle2,
  Text,
  Title2,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowUploadRegular,
  CheckmarkCircleFilled,
  CheckmarkRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  DismissRegular,
  DocumentRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import { Cr174_loanapplicsService } from '../generated';
import { useLoanData } from '../context/LoanDataContext';
import { useCurrentUser } from '../context/UserContext';
import type { LoanApplication } from '../models/loan';
import {
  classifyLoanType,
  deriveLoanTypeOptions,
  toErrorMessage,
  type LoanCategory,
} from '../models/loan';
import { Surface } from './Surface';
import { LoanSummaryCard } from './LoanSummaryCard';
import { buildSubmissionStamp } from '../utils/referenceNumber';
import {
  isDocumentUploadConfigured,
  uploadLoanDocuments,
} from '../services/LoanDocumentUploadService';

interface FormState {
  applicantName: string;
  applicantEmail: string;
  phone: string;
  collegeName: string;
  amount: string;
  propertyValue: string;
  loanType: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

/** Public alias for the form values, used by callers for `initialValues`. */
export type LoanApplicationFormValues = FormState;

const EMPTY_FORM: FormState = {
  applicantName: '',
  applicantEmail: '',
  phone: '',
  collegeName: '',
  amount: '',
  propertyValue: '',
  loanType: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Document upload constraints (the actual files go to SharePoint via the flow).
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Step 0 collects all details (Applicant + Loan + Documents) in clear sections;
// step 1 reviews; step 2 is the success state.
const STEPS = ['Application Details', 'Review & Submit', 'Completed'] as const;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '880px',
    width: '100%',
    marginInline: 'auto',
  },
  header: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  subtitle: { color: tokens.colorNeutralForeground2 },
  stepper: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  stepRow: { display: 'flex', gap: tokens.spacingHorizontalM, justifyContent: 'space-between' },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  stepDot: {
    width: '28px',
    height: '28px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground3,
  },
  stepDotActive: { backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand },
  stepDotDone: { backgroundColor: tokens.colorPaletteGreenBackground3, color: tokens.colorNeutralForegroundOnBrand },
  stepLabel: { color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' },
  stepLabelActive: { color: tokens.colorNeutralForeground1, fontWeight: tokens.fontWeightSemibold },
  // Step body holds the clearly-separated sections.
  stepBody: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXL },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  sectionHelp: { color: tokens.colorNeutralForeground2 },
  uploadRow: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  fileHint: { color: tokens.colorNeutralForeground3 },
  fileList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  fileIcon: { fontSize: '20px', color: tokens.colorBrandForeground1, flexShrink: 0 },
  fileMeta: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  fileName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize: { color: tokens.colorNeutralForeground3 },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  actionsLeft: { display: 'flex' },
  actionsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  draftNote: { color: tokens.colorNeutralForeground3, display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  success: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: tokens.spacingVerticalM,
    paddingBlock: tokens.spacingVerticalXXL,
  },
  successIcon: {
    fontSize: '72px',
    color: tokens.colorPaletteGreenForeground1,
    animationName: {
      from: { transform: 'scale(0.4)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    animationDuration: tokens.durationSlow,
    animationTimingFunction: tokens.curveDecelerateMid,
  },
  refPill: {
    fontFamily: tokens.fontFamilyMonospace,
    fontWeight: tokens.fontWeightSemibold,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  successActions: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', justifyContent: 'center' },
});

// Validation rules are unchanged — the applicant + loan checks now run together on
// the single "Application Details" step (step 0). Phone is optional (no rule).
function validateStep(
  step: number,
  form: FormState,
  loanTypesAvailable: boolean,
  category: LoanCategory,
): FormErrors {
  const errors: FormErrors = {};
  if (step === 0) {
    if (!form.applicantName.trim()) errors.applicantName = 'Applicant name is required.';
    if (!form.applicantEmail.trim()) errors.applicantEmail = 'Applicant email is required.';
    else if (!EMAIL_PATTERN.test(form.applicantEmail.trim()))
      errors.applicantEmail = 'Enter a valid email address.';

    if (loanTypesAvailable && !form.loanType) errors.loanType = 'Select a loan type.';

    const amount = Number(form.amount);
    if (!form.amount.trim()) errors.amount = 'Loan amount is required.';
    else if (Number.isNaN(amount)) errors.amount = 'Loan amount must be a number.';
    else if (amount <= 0) errors.amount = 'Loan amount must be greater than zero.';

    // Home loans capture the property value; education loans capture the college.
    if (category === 'home') {
      const propertyValue = Number(form.propertyValue);
      if (!form.propertyValue.trim()) errors.propertyValue = 'Property value is required.';
      else if (Number.isNaN(propertyValue)) errors.propertyValue = 'Property value must be a number.';
      else if (propertyValue <= 0) errors.propertyValue = 'Property value must be greater than zero.';
    } else if (category === 'education') {
      if (!form.collegeName.trim()) errors.collegeName = 'College name is required.';
    }
  }
  return errors;
}

function loadInitial(key: string, initialValues?: Partial<FormState>): FormState {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return { ...EMPTY_FORM, ...(JSON.parse(raw) as Partial<FormState>) };
  } catch {
    // Ignore a malformed draft and fall back to the provided initial values.
  }
  return { ...EMPTY_FORM, ...(initialValues ?? {}) };
}

export interface LoanApplicationFormProps {
  /** Heading title. */
  title?: string;
  /** Heading subtitle. */
  subtitle?: string;
  /** Hide the built-in heading (when the host page renders its own header). */
  hideHeader?: boolean;
  /** Pre-populate the form (e.g. for reapply). An existing draft takes precedence. */
  initialValues?: Partial<LoanApplicationFormValues>;
  /** localStorage key for the autosaved draft (keep distinct per portal/flow). */
  draftKey?: string;
  /** Dataverse status choice to set on the new record (e.g. ReSubmitted). */
  statusCode?: number;
  /** Primary action shown on the success screen (e.g. "View Applications"). */
  successAction?: { label: string; onClick: () => void };
  /** Override the success-screen buttons entirely (takes precedence over successAction). */
  successActions?: ReactNode;
  /** Optional cancel link shown below the wizard. */
  onCancel?: () => void;
  /** Label for the cancel link. */
  cancelLabel?: string;
}

/**
 * Reusable loan application wizard. Owns all form state, validation, conditional
 * fields, autosave, and the Dataverse submit. Wrapper pages (admin New
 * Application / applicant Apply Loan / Reapply) only customise the heading, draft
 * key, prefill, status, and the success/cancel navigation.
 */
export function LoanApplicationForm({
  title = 'New Loan Application',
  subtitle = 'A guided submission to Dataverse. Your progress is saved automatically.',
  hideHeader = false,
  initialValues,
  draftKey = 'innorve-new-application-draft',
  statusCode,
  successAction,
  successActions,
  onCancel,
  cancelLabel = 'Cancel',
}: LoanApplicationFormProps) {
  const styles = useStyles();
  const { records, reload } = useLoanData();
  const { user } = useCurrentUser();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => loadInitial(draftKey, initialValues));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [createdRef, setCreatedRef] = useState<string>('');

  // Documents are staged in memory and uploaded to SharePoint after submit (once
  // the reference number exists). Kept out of `form` so the draft autosave never
  // tries to serialise File objects.
  const [files, setFiles] = useState<File[]>([]);
  const [fileHint, setFileHint] = useState<string>('');
  const [uploadNotice, setUploadNotice] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    // A FileList is live and tied to the <input>; copy it to a real array NOW,
    // before onChange resets the input value. Otherwise the deferred setState
    // updater below would read an already-emptied list and add nothing.
    const incoming = Array.from(list);
    const oversize = incoming.filter((f) => f.size > MAX_FILE_BYTES).map((f) => f.name);
    setFiles((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_FILES) break;
        if (file.size > MAX_FILE_BYTES) continue;
        if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
        next.push(file);
      }
      return next;
    });
    setFileHint(oversize.length ? `Skipped (over 10 MB): ${oversize.join(', ')}` : '');
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileHint('');
  }, []);

  const loanTypes = useMemo(() => deriveLoanTypeOptions(records), [records]);
  const loanTypeLabel = useMemo(
    () => loanTypes.find((o) => String(o.value) === form.loanType)?.label ?? '',
    [loanTypes, form.loanType],
  );
  const category = useMemo(() => classifyLoanType(loanTypeLabel), [loanTypeLabel]);

  // Autosave the draft until the application is completed.
  useEffect(() => {
    if (step < 2) {
      window.localStorage.setItem(draftKey, JSON.stringify(form));
    }
  }, [form, step, draftKey]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const goNext = () => {
    const stepErrors = validateStep(step, form, loanTypes.length > 0, category);
    setErrors(stepErrors);
    if (Object.values(stepErrors).some(Boolean)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = useCallback(async () => {
    setSubmitError('');

    // Final safety net: applicant name and loan type are required before submit.
    if (!form.applicantName.trim() || (loanTypes.length > 0 && !form.loanType)) {
      setSubmitError('Please provide the applicant name and loan type before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      // Generate the reference number and created date at the moment of submission,
      // mirroring the Canvas app ("LN-" & Text(Now(), "yyyymmddhhmmss") and Now()).
      const { referenceNumber, createdDate } = buildSubmissionStamp();

      const record: Omit<LoanApplication, 'cr174_loanapplicid'> = {
        cr174_referencenumber: referenceNumber,
        cr174_createddate: createdDate,
        cr174_applicantname: form.applicantName.trim(),
        cr174_applicantemail: form.applicantEmail.trim(),
        cr174_amount: Number(form.amount),
        ...(form.phone.trim() ? { cr174_phonenumber: form.phone.trim() } : {}),
        ...(statusCode !== undefined ? { cr174_status: statusCode } : {}),
        ...(form.loanType ? { cr174_loantype: Number(form.loanType) } : {}),
        ...(category === 'education' ? { cr174_collegename: form.collegeName.trim() } : {}),
        ...(category === 'home' ? { cr174_propertyvalue: Number(form.propertyValue) } : {}),
      };

      const result = await Cr174_loanapplicsService.create(record);
      if (!result.success) {
        throw result.error ?? new Error('The service returned an unsuccessful response.');
      }

      // Prefer the value echoed back by Dataverse; fall back to the one we generated.
      const finalRef = result.data?.cr174_referencenumber ?? referenceNumber;
      const newId = result.data?.cr174_loanapplicid;

      // Upload any attached documents to SharePoint (best effort). The application
      // is already created, so an upload failure must never fail the submission —
      // we surface a warning on the success screen instead.
      if (files.length > 0) {
        if (isDocumentUploadConfigured()) {
          try {
            const { uploaded, failed } = await uploadLoanDocuments(files, {
              referenceNumber: finalRef,
              applicantName: form.applicantName.trim(),
              applicantEmail: form.applicantEmail.trim(),
              uploadedBy: user.email || form.applicantEmail.trim(),
            });
            // Flag the record once at least one document made it to SharePoint.
            if (uploaded.length > 0 && newId) {
              try {
                await Cr174_loanapplicsService.update(newId, { cr174_documentsuploaded: true });
              } catch {
                // The flag is non-critical; ignore if the update is rejected.
              }
            }
            if (failed.length > 0) {
              setUploadNotice(
                `${uploaded.length} of ${files.length} document(s) uploaded. Could not upload: ${failed
                  .map((f) => f.fileName)
                  .join(', ')}.`,
              );
            }
          } catch (uploadErr) {
            setUploadNotice(
              toErrorMessage(
                uploadErr,
                'Your application was submitted, but the documents could not be uploaded.',
              ),
            );
          }
        } else {
          setUploadNotice(
            'Your application was submitted, but document upload is not configured, so the attached files were not sent.',
          );
        }
      }

      setCreatedRef(finalRef);
      window.localStorage.removeItem(draftKey);
      void reload();
      setStep(2);
    } catch (err) {
      setSubmitError(
        toErrorMessage(err, 'The loan application could not be created. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, category, loanTypes.length, reload, draftKey, statusCode, files, user.email]);

  const startAnother = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setCreatedRef('');
    setSubmitError('');
    setFiles([]);
    setFileHint('');
    setUploadNotice('');
    setStep(0);
  };

  return (
    <div className={styles.root}>
      {!hideHeader && (
        <div className={styles.header}>
          <Title2 as="h2">{title}</Title2>
          <Body1 className={styles.subtitle}>{subtitle}</Body1>
        </div>
      )}

      <Surface>
        <div className={styles.stepper}>
          <div className={styles.stepRow}>
            {STEPS.map((label, index) => {
              const done = index < step;
              const active = index === step;
              return (
                <div key={label} className={styles.step}>
                  <span
                    className={mergeClasses(
                      styles.stepDot,
                      done && styles.stepDotDone,
                      active && styles.stepDotActive,
                    )}
                  >
                    {done ? <CheckmarkRegular /> : index + 1}
                  </span>
                  <Caption1
                    className={mergeClasses(styles.stepLabel, active && styles.stepLabelActive)}
                  >
                    {label}
                  </Caption1>
                </div>
              );
            })}
          </div>
          <ProgressBar value={(step + 1) / STEPS.length} thickness="large" />
        </div>
      </Surface>

      {submitError && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Submission failed</MessageBarTitle>
            {submitError}
          </MessageBarBody>
        </MessageBar>
      )}

      <Surface>
        {step === 0 && (
          <div className={styles.stepBody}>
            {/* Section 1 — Applicant Information */}
            <div className={styles.section}>
              <Subtitle2 as="h3">Applicant Information</Subtitle2>
              <Divider />
              <div className={styles.twoColumn}>
                <Field
                  label="Applicant Name"
                  required
                  validationState={errors.applicantName ? 'error' : 'none'}
                  validationMessage={errors.applicantName}
                >
                  <Input
                    value={form.applicantName}
                    onChange={(_e, d) => update('applicantName', d.value)}
                    placeholder="Full name"
                  />
                </Field>
                <Field
                  label="Applicant Email"
                  required
                  validationState={errors.applicantEmail ? 'error' : 'none'}
                  validationMessage={errors.applicantEmail}
                >
                  <Input
                    type="email"
                    value={form.applicantEmail}
                    onChange={(_e, d) => update('applicantEmail', d.value)}
                    placeholder="name@example.com"
                  />
                </Field>
                <Field label="Phone Number">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(_e, d) => update('phone', d.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                </Field>
              </div>
            </div>

            {/* Section 2 — Loan Details */}
            <div className={styles.section}>
              <Subtitle2 as="h3">Loan Details</Subtitle2>
              <Divider />
              <Field
                label="Loan Type"
                required={loanTypes.length > 0}
                validationState={errors.loanType ? 'error' : 'none'}
                validationMessage={errors.loanType}
                hint={loanTypes.length === 0 ? 'No loan types available yet from existing records.' : undefined}
              >
                <Dropdown
                  placeholder={loanTypes.length === 0 ? 'No loan types available' : 'Select a loan type'}
                  disabled={loanTypes.length === 0}
                  selectedOptions={form.loanType ? [form.loanType] : []}
                  value={loanTypeLabel}
                  onOptionSelect={(_e, d) => update('loanType', d.optionValue ?? '')}
                >
                  {loanTypes.map((o) => (
                    <Option key={o.value} value={String(o.value)} text={o.label}>
                      {o.label}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <div className={styles.twoColumn}>
                <Field
                  label="Loan Amount"
                  required
                  validationState={errors.amount ? 'error' : 'none'}
                  validationMessage={errors.amount}
                >
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.amount}
                    onChange={(_e, d) => update('amount', d.value)}
                    contentBefore={<Body1>₹</Body1>}
                    placeholder="0"
                  />
                </Field>
                {category === 'home' && (
                  <Field
                    label="Property Value"
                    required
                    validationState={errors.propertyValue ? 'error' : 'none'}
                    validationMessage={errors.propertyValue}
                  >
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={form.propertyValue}
                      onChange={(_e, d) => update('propertyValue', d.value)}
                      contentBefore={<Body1>₹</Body1>}
                      placeholder="0"
                    />
                  </Field>
                )}
                {category === 'education' && (
                  <Field
                    label="College Name"
                    required
                    validationState={errors.collegeName ? 'error' : 'none'}
                    validationMessage={errors.collegeName}
                  >
                    <Input
                      value={form.collegeName}
                      onChange={(_e, d) => update('collegeName', d.value)}
                      placeholder="Institution name"
                    />
                  </Field>
                )}
              </div>
              {form.loanType && category === 'other' && (
                <Caption1 className={styles.subtitle}>
                  No additional details are required for this loan type.
                </Caption1>
              )}
            </div>

            {/* Section 3 — Documents (attach now; uploaded to SharePoint on submit) */}
            <div className={styles.section}>
              <Subtitle2 as="h3">Documents</Subtitle2>
              <Divider />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                style={{ display: 'none' }}
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <div className={styles.uploadRow}>
                <Button
                  appearance="secondary"
                  icon={<ArrowUploadRegular />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={files.length >= MAX_FILES}
                >
                  Add files
                </Button>
                {files.length > 0 && (
                  <Caption1 className={styles.fileHint}>
                    {files.length} of {MAX_FILES} added
                  </Caption1>
                )}
              </div>
              {fileHint && <Caption1 className={styles.fileHint}>{fileHint}</Caption1>}
              {files.length > 0 && (
                <div className={styles.fileList}>
                  {files.map((file, index) => (
                    <div key={`${file.name}-${file.size}`} className={styles.fileRow}>
                      <DocumentRegular className={styles.fileIcon} aria-hidden />
                      <div className={styles.fileMeta}>
                        <Body1 className={styles.fileName}>{file.name}</Body1>
                        <Caption1 className={styles.fileSize}>{formatBytes(file.size)}</Caption1>
                      </div>
                      <Button
                        appearance="subtle"
                        icon={<DismissRegular />}
                        aria-label={`Remove ${file.name}`}
                        onClick={() => removeFile(index)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {!isDocumentUploadConfigured() && (
                <Caption1 className={styles.fileHint}>
                  Note: the document upload service isn't configured yet, so attached files won't be
                  sent.
                </Caption1>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={styles.form}>
            <Subtitle2 as="h3">Review &amp; Submit</Subtitle2>
            <Body1 className={styles.subtitle}>
              Confirm the details below. Use Back to edit anything before submitting.
            </Body1>
            <LoanSummaryCard
              framed={false}
              applicantName={form.applicantName}
              applicantEmail={form.applicantEmail}
              phone={form.phone}
              collegeName={category === 'education' ? form.collegeName : ''}
              amount={Number(form.amount)}
              propertyValue={category === 'home' ? Number(form.propertyValue) : undefined}
              loanTypeLabel={loanTypeLabel}
            />
          </div>
        )}

        {step === 2 && (
          <div className={styles.success}>
            <CheckmarkCircleFilled className={styles.successIcon} aria-hidden />
            <Subtitle1>Application submitted</Subtitle1>
            <Body1 className={styles.subtitle}>
              The loan application for {form.applicantName || 'the applicant'} was created
              successfully.
            </Body1>
            {createdRef ? (
              <Text className={styles.refPill}>{createdRef}</Text>
            ) : (
              <Caption1 className={styles.subtitle}>Reference number is being generated.</Caption1>
            )}
            {uploadNotice && (
              <MessageBar intent="warning">
                <MessageBarBody>{uploadNotice}</MessageBarBody>
              </MessageBar>
            )}
            <div className={styles.successActions}>
              {successActions ?? (
                <>
                  {successAction && (
                    <Button appearance="primary" onClick={successAction.onClick}>
                      {successAction.label}
                    </Button>
                  )}
                  <Button onClick={startAnother}>Create Another</Button>
                </>
              )}
            </div>
          </div>
        )}

        {step < 2 && (
          <div className={styles.actions} style={{ marginTop: tokens.spacingVerticalXL }}>
            <div className={styles.actionsLeft}>
              {step > 0 && (
                <Button appearance="subtle" icon={<ChevronLeftRegular />} onClick={goBack}>
                  Back
                </Button>
              )}
            </div>
            <div className={styles.actionsRight}>
              <Caption1 className={styles.draftNote}>
                <SaveRegular /> Draft saved
              </Caption1>
              {step < 1 ? (
                <Button
                  appearance="primary"
                  icon={<ChevronRightRegular />}
                  iconPosition="after"
                  onClick={goNext}
                >
                  Next
                </Button>
              ) : (
                <Button
                  appearance="primary"
                  icon={submitting ? <Spinner size="tiny" /> : <SaveRegular />}
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting
                    ? files.length > 0
                      ? 'Submitting & uploading…'
                      : 'Submitting…'
                    : 'Submit Application'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Surface>

      {step < 2 && onCancel && (
        <Button appearance="transparent" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}

export default LoanApplicationForm;
