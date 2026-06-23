import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Body1,
  Button,
  Caption1,
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
  Text,
  Title2,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkCircleFilled,
  CheckmarkRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { Cr174_loanapplicsService } from '../generated';
import { useLoanData } from '../context/LoanDataContext';
import type { LoanApplication } from '../models/loan';
import {
  classifyLoanType,
  deriveLoanTypeOptions,
  toErrorMessage,
  type LoanCategory,
} from '../models/loan';
import { Surface } from '../components/Surface';
import { LoanSummaryCard } from '../components/LoanSummaryCard';
import { buildSubmissionStamp } from '../utils/referenceNumber';

interface FormState {
  applicantName: string;
  applicantEmail: string;
  collegeName: string;
  amount: string;
  propertyValue: string;
  loanType: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  applicantName: '',
  applicantEmail: '',
  collegeName: '',
  amount: '',
  propertyValue: '',
  loanType: '',
};

const DRAFT_KEY = 'innorve-new-application-draft';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = ['Applicant', 'Loan details', 'Review', 'Done'] as const;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '820px',
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
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
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
  }
  if (step === 1) {
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

function loadDraft(): FormState {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_FORM;
    return { ...EMPTY_FORM, ...(JSON.parse(raw) as Partial<FormState>) };
  } catch {
    return EMPTY_FORM;
  }
}

export function NewApplication() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { records, reload } = useLoanData();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(loadDraft);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [createdRef, setCreatedRef] = useState<string>('');

  const loanTypes = useMemo(() => deriveLoanTypeOptions(records), [records]);
  const loanTypeLabel = useMemo(
    () => loanTypes.find((o) => String(o.value) === form.loanType)?.label ?? '',
    [loanTypes, form.loanType],
  );
  const category = useMemo(() => classifyLoanType(loanTypeLabel), [loanTypeLabel]);

  // Autosave the draft while filling the form (steps 0–2 only).
  useEffect(() => {
    if (step < 3) {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, step]);

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
        ...(form.loanType ? { cr174_loantype: Number(form.loanType) } : {}),
        ...(category === 'education' ? { cr174_collegename: form.collegeName.trim() } : {}),
        ...(category === 'home' ? { cr174_propertyvalue: Number(form.propertyValue) } : {}),
      };

      const result = await Cr174_loanapplicsService.create(record);
      if (!result.success) {
        throw result.error ?? new Error('The service returned an unsuccessful response.');
      }

      // Prefer the value echoed back by Dataverse; fall back to the one we generated.
      setCreatedRef(result.data?.cr174_referencenumber ?? referenceNumber);
      window.localStorage.removeItem(DRAFT_KEY);
      void reload();
      setStep(3);
    } catch (err) {
      setSubmitError(
        toErrorMessage(err, 'The loan application could not be created. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, category, loanTypes.length, reload]);

  const startAnother = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setCreatedRef('');
    setSubmitError('');
    setStep(0);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title2>New Loan Application</Title2>
        <Body1 className={styles.subtitle}>
          A guided, multi-step submission to Dataverse. Your progress is saved automatically.
        </Body1>
      </div>

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
          <div className={styles.form}>
            <Subtitle1>Applicant Information</Subtitle1>
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
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={styles.form}>
            <Subtitle1>Loan Information</Subtitle1>
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
        )}

        {step === 2 && (
          <div className={styles.form}>
            <Subtitle1>Review &amp; Submit</Subtitle1>
            <Body1 className={styles.subtitle}>
              Confirm the details below. Use Back to edit anything before submitting.
            </Body1>
            <LoanSummaryCard
              framed={false}
              applicantName={form.applicantName}
              applicantEmail={form.applicantEmail}
              collegeName={category === 'education' ? form.collegeName : ''}
              amount={Number(form.amount)}
              propertyValue={category === 'home' ? Number(form.propertyValue) : undefined}
              loanTypeLabel={loanTypeLabel}
            />
          </div>
        )}

        {step === 3 && (
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
            <div className={styles.successActions}>
              <Button appearance="primary" onClick={() => navigate('/applications')}>
                View Applications
              </Button>
              <Button onClick={startAnother}>Create Another</Button>
            </div>
          </div>
        )}

        {step < 3 && (
          <div className={styles.actions} style={{ marginTop: tokens.spacingVerticalL }}>
            <div>
              {step > 0 && (
                <Button appearance="subtle" icon={<ChevronLeftRegular />} onClick={goBack}>
                  Back
                </Button>
              )}
            </div>
            <Caption1 className={styles.draftNote}>
              <SaveRegular /> Draft saved
            </Caption1>
            {step < 2 ? (
              <Button
                appearance="primary"
                icon={<ChevronRightRegular />}
                iconPosition="after"
                onClick={goNext}
              >
                Continue
              </Button>
            ) : (
              <Button
                appearance="primary"
                icon={submitting ? <Spinner size="tiny" /> : <SaveRegular />}
                onClick={() => void handleSubmit()}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Application'}
              </Button>
            )}
          </div>
        )}
      </Surface>

      {step < 3 && (
        <Button appearance="transparent" onClick={() => navigate('/dashboard')}>
          Cancel and return to dashboard
        </Button>
      )}
    </div>
  );
}

export default NewApplication;
