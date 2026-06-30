import { useNavigate } from 'react-router-dom';
import { LoanApplicationForm } from '../../components/LoanApplicationForm';

/**
 * Applicant portal — Apply for a Loan. Reuses the exact same LoanApplicationForm
 * as the admin's New Application (one form, one validation, one submit), with a
 * distinct draft key and applicant-portal navigation.
 */
export function ApplyLoan() {
  const navigate = useNavigate();
  return (
    <LoanApplicationForm
      title="Apply for a Loan"
      subtitle="Complete the steps below to submit your loan application. Your progress is saved automatically."
      draftKey="innorve-apply-loan-draft"
      successAction={{
        label: 'View My Applications',
        onClick: () => navigate('/user/my-applications'),
      }}
      onCancel={() => navigate('/user/home')}
      cancelLabel="Cancel and return to home"
    />
  );
}

export default ApplyLoan;
