import { useNavigate } from 'react-router-dom';
import { LoanApplicationForm } from '../components/LoanApplicationForm';

/**
 * Admin portal — New Application. Thin wrapper around the shared
 * LoanApplicationForm; only the success/cancel navigation differs from the
 * applicant portal's Apply Loan page.
 */
export function NewApplication() {
  const navigate = useNavigate();
  return (
    <LoanApplicationForm
      successAction={{
        label: 'View Applications',
        onClick: () => navigate('/admin/applications'),
      }}
      onCancel={() => navigate('/admin/dashboard')}
      cancelLabel="Cancel and return to dashboard"
    />
  );
}

export default NewApplication;
